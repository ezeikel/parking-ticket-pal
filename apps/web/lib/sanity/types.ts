import type { PortableTextBlock } from '@portabletext/types';

// Simplified Sanity image type - doesn't need full SanityImageSource
type SanityImageReference = {
  asset?: {
    _id?: string;
    url?: string;
  };
};

/**
 * Sanity Blog Post Types
 */

export type SanityAuthor = {
  _id: string;
  name: string;
  slug: { current: string };
  title?: string;
  image?: SanityImageReference;
  bio?: PortableTextBlock[];
};

export type SanityCategory = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  postCount?: number;
};

export type SanityFeaturedImage = {
  asset: {
    _id: string;
    url: string;
    metadata?: {
      lqip?: string;
      dimensions?: {
        width: number;
        height: number;
        aspectRatio: number;
      };
    };
  };
  alt?: string;
  credit?: string;
  creditUrl?: string;
};

export type SanitySeo = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: SanityImageReference;
};

export type SanityPost = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  body: PortableTextBlock[];
  publishedAt: string;
  featuredImage?: SanityFeaturedImage;
  author?: SanityAuthor;
  categories?: SanityCategory[];
  seo?: SanitySeo;
  readingTime?: number;
};

/**
 * Type for the post listing (without full body)
 */
export type SanityPostSummary = Omit<SanityPost, 'body' | 'seo'>;

/**
 * Transform Sanity post to legacy Post format for backwards compatibility
 */
export function transformSanityPostToLegacy(post: SanityPost): {
  meta: {
    title: string;
    date: string;
    author: {
      name: string;
      title: string;
      avatar: string;
    };
    summary: string;
    image?: string;
    tags: string[];
    featured?: boolean;
    slug: string;
  };
  content: PortableTextBlock[];
  readingTime: string;
} {
  return {
    meta: {
      title: post.title,
      date: post.publishedAt,
      author: {
        name: post.author?.name ?? 'Parking Ticket Pal',
        title: post.author?.title ?? 'Team',
        avatar: post.author?.image
          ? ((post.author.image as { asset?: { url?: string } })?.asset?.url ??
            '')
          : '',
      },
      summary: post.excerpt ?? '',
      image: post.featuredImage?.asset?.url,
      tags: post.categories?.map((cat) => cat.title) ?? [],
      featured: false,
      slug: post.slug.current,
    },
    content: post.body,
    readingTime: post.readingTime
      ? `${post.readingTime} min read`
      : '5 min read',
  };
}

/**
 * Transform array of Sanity posts to legacy format
 */
export function transformSanityPostsToLegacy(
  posts: SanityPostSummary[],
): Array<{
  meta: {
    title: string;
    date: string;
    author: {
      name: string;
      title: string;
      avatar: string;
    };
    summary: string;
    image?: string;
    tags: string[];
    featured?: boolean;
    slug: string;
  };
  content: string;
  readingTime: string;
}> {
  return posts.map((post) => ({
    meta: {
      title: post.title,
      date: post.publishedAt,
      author: {
        name: post.author?.name ?? 'Parking Ticket Pal',
        title: post.author?.title ?? 'Team',
        avatar: post.author?.image
          ? ((post.author.image as { asset?: { url?: string } })?.asset?.url ??
            '')
          : '',
      },
      summary: post.excerpt ?? '',
      image: post.featuredImage?.asset?.url,
      tags: post.categories?.map((cat) => cat.title) ?? [],
      featured: false,
      slug: post.slug.current,
    },
    content: '', // Listing doesn't need full content
    readingTime: post.readingTime
      ? `${post.readingTime} min read`
      : '5 min read',
  }));
}
