import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Post, PostMeta } from '@/types';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export const getPostBySlug = (slug: string): Post => {
  const realSlug = slug.replace(/\.mdx$/, '');
  const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  return {
    meta: { ...(data as PostMeta), slug: realSlug },
    content,
    readingTime: stats.text,
  };
};

export const getAllPosts = (): Post[] => {
  const slugs = fs.readdirSync(postsDirectory);
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .sort((post1, post2) =>
      new Date(post1.meta.date) > new Date(post2.meta.date) ? -1 : 1,
    );
  return posts;
};
