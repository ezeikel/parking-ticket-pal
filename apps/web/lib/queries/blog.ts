'use cache';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { list } from '@vercel/blob';
import { STORAGE_PATHS } from '@/constants';
import { cacheLife, cacheTag } from 'next/cache';
import type { Post, PostMeta } from '@/types';
import { notFound } from 'next/navigation';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'blog-query' });

const postsDirectory = path.join(process.cwd(), 'content/blog');

/**
 * Get a single blog post by slug with caching
 */
export const getPostBySlug = async (slug: string): Promise<Post> => {
  cacheLife('blog');
  cacheTag('blog', `blog-post-${slug}`);

  const realSlug = slug.replace(/\.mdx$/, '');

  // first, try to read from local file system
  const localPath = path.join(postsDirectory, `${realSlug}.mdx`);
  let fileContents: string;

  if (fs.existsSync(localPath)) {
    fileContents = fs.readFileSync(localPath, 'utf8');
  } else {
    // if not found locally, try blob storage
    const blobPath = STORAGE_PATHS.BLOG_POST.replace('%s', realSlug);
    try {
      const { blobs } = await list({ prefix: blobPath });

      if (blobs.length === 0) {
        notFound();
      }

      const response = await fetch(blobs[0].url);
      fileContents = await response.text();
    } catch (error) {
      logger.error(
        'Error fetching blog post from blob storage',
        {
          slug: realSlug,
          blobPath,
        },
        error instanceof Error ? error : new Error(String(error)),
      );
      notFound();
    }
  }

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

/**
 * Get all blog posts with caching
 */
export const getAllPosts = async (): Promise<Post[]> => {
  cacheLife('blog');
  cacheTag('blog', 'blog-posts');

  const allSlugs: Array<{ slug: string; date: string }> = [];

  // get posts from local file system
  if (fs.existsSync(postsDirectory)) {
    const localSlugs = fs.readdirSync(postsDirectory);
    const localPosts = localSlugs.map((slug) => {
      const realSlug = slug.replace(/\.mdx$/, '');
      const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      return { slug: realSlug, date: data.date };
    });
    allSlugs.push(...localPosts);
  }

  // get posts from blob storage
  try {
    const { blobs } = await list({ prefix: 'blog/' });
    const blobPosts = await Promise.all(
      blobs.map(async (blob) => {
        const response = await fetch(blob.url);
        const content = await response.text();
        const { data } = matter(content);
        const slug = blob.pathname.replace('blog/', '').replace('.mdx', '');
        return { slug, date: data.date };
      }),
    );
    allSlugs.push(...blobPosts);
  } catch (error) {
    logger.error(
      'Error fetching blog posts from blob storage',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // remove duplicates (prefer local files over blob storage)
  const uniqueSlugs = allSlugs.filter(
    (post, index, self) =>
      index === self.findIndex((p) => p.slug === post.slug),
  );

  // Note: We can't use the cached getPostBySlug here as it would create circular caching
  // Instead, fetch the posts directly
  const posts = await Promise.all(
    uniqueSlugs
      // filter out posts with a future date
      .filter((post) => new Date(post.date) <= new Date())
      // get the full post data for the remaining posts
      .map(async (post) => {
        const realSlug = post.slug.replace(/\.mdx$/, '');
        const localPath = path.join(postsDirectory, `${realSlug}.mdx`);
        let fileContents: string;

        if (fs.existsSync(localPath)) {
          fileContents = fs.readFileSync(localPath, 'utf8');
        } else {
          const blobPath = STORAGE_PATHS.BLOG_POST.replace('%s', realSlug);
          const { blobs } = await list({ prefix: blobPath });
          const response = await fetch(blobs[0].url);
          fileContents = await response.text();
        }

        const { data, content } = matter(fileContents);
        const stats = readingTime(content);

        return {
          meta: { ...(data as PostMeta), slug: realSlug },
          content,
          readingTime: stats.text,
        };
      }),
  );

  // sort them
  return posts.sort((post1, post2) =>
    new Date(post1.meta.date) > new Date(post2.meta.date) ? -1 : 1,
  );
};

/**
 * Get list of already covered topics from existing blog posts
 */
export const getCoveredTopics = async (): Promise<string[]> => {
  cacheLife('blog');
  cacheTag('blog', 'blog-topics');

  try {
    const posts = await getAllPosts();
    return posts.map((post) => post.meta.slug);
  } catch (error) {
    logger.error(
      'Error getting covered topics',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    return [];
  }
};
