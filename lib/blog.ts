import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Post, PostMeta } from '@/types';
import { notFound } from 'next/navigation';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export const getPostBySlug = (slug: string): Post => {
  const realSlug = slug.replace(/\.mdx$/, '');
  const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    notFound();
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  // if post date is in the future, treat as not found
  // this prevents direct access to unpublished posts
  if (new Date(data.date) > new Date()) {
    notFound();
  }

  return {
    meta: { ...(data as PostMeta), slug: realSlug },
    content,
    readingTime: stats.text,
  };
};

export const getAllPosts = (): Post[] => {
  const slugs = fs.readdirSync(postsDirectory);
  const posts = slugs
    .map((slug) => {
      // lighter read here just for the date
      const realSlug = slug.replace(/\.mdx$/, '');
      const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      return { slug: realSlug, date: data.date };
    })
    // filter out posts with a future date
    .filter((post) => new Date(post.date) <= new Date())
    // get the full post data for the remaining posts
    .map((post) => getPostBySlug(post.slug))
    // sort them
    .sort((post1, post2) =>
      new Date(post1.meta.date) > new Date(post2.meta.date) ? -1 : 1,
    );
  return posts;
};
