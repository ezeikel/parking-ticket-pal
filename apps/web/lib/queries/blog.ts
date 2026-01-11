'use cache';

import { cacheLife, cacheTag } from 'next/cache';
import { createServerLogger } from '@/lib/logger';
import { client } from '@/lib/sanity/client';
import { postsQuery, postBySlugQuery, postSlugsQuery } from '@/lib/sanity/queries';
import type { SanityPost, SanityPostSummary } from '@/lib/sanity/types';
import {
  transformSanityPostToLegacy,
  transformSanityPostsToLegacy,
} from '@/lib/sanity/types';
import type { Post } from '@/types';
import type { PortableTextBlock } from '@portabletext/types';

const logger = createServerLogger({ action: 'blog-query' });

/**
 * Transform a Sanity post with Portable Text body to a legacy Post type
 * This maintains backwards compatibility with existing components
 */
function toPost(post: SanityPost): Post & { bodyBlocks: PortableTextBlock[] } {
  const transformed = transformSanityPostToLegacy(post);
  return {
    meta: transformed.meta,
    content: '', // Legacy MDX content string - not used for Sanity posts
    readingTime: transformed.readingTime,
    bodyBlocks: transformed.content, // Portable Text blocks for rendering
  };
}

/**
 * Get a single blog post by slug with caching
 */
export const getPostBySlug = async (
  slug: string,
): Promise<(Post & { bodyBlocks: PortableTextBlock[] }) | null> => {
  cacheLife('blog');
  cacheTag('blog', `blog-post-${slug}`);

  try {
    const post = await client.fetch<SanityPost | null>(postBySlugQuery, {
      slug,
    });

    if (!post) {
      return null;
    }

    // Check if post is scheduled for the future
    if (new Date(post.publishedAt) > new Date()) {
      return null;
    }

    return toPost(post);
  } catch (error) {
    logger.error(
      'Error fetching blog post from Sanity',
      { slug },
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
};

/**
 * Get all blog posts with caching
 */
export const getAllPosts = async (): Promise<Post[]> => {
  cacheLife('blog');
  cacheTag('blog', 'blog-posts');

  try {
    const posts = await client.fetch<SanityPostSummary[]>(postsQuery);

    if (!posts || posts.length === 0) {
      return [];
    }

    // Transform Sanity posts to legacy format
    return transformSanityPostsToLegacy(posts);
  } catch (error) {
    logger.error(
      'Error fetching blog posts from Sanity',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    return [];
  }
};

/**
 * Get all post slugs for static generation
 */
export const getAllPostSlugs = async (): Promise<string[]> => {
  cacheLife('blog');
  cacheTag('blog', 'blog-slugs');

  try {
    const slugs = await client.fetch<string[]>(postSlugsQuery);
    return slugs ?? [];
  } catch (error) {
    logger.error(
      'Error fetching blog post slugs from Sanity',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    return [];
  }
};

/**
 * Get list of already covered topics from existing blog posts
 */
export const getCoveredTopics = async (): Promise<string[]> => {
  cacheLife('blog');
  cacheTag('blog', 'blog-topics');

  try {
    const slugs = await getAllPostSlugs();
    return slugs;
  } catch (error) {
    logger.error(
      'Error getting covered topics',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    return [];
  }
};
