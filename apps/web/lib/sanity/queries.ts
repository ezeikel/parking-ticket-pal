import { groq } from 'next-sanity';

// ============================================================================
// Post Queries
// ============================================================================

/**
 * Get all published posts for the blog listing page
 */
export const postsQuery = groq`
  *[_type == "post" && status == "published"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    featuredImage {
      asset->,
      alt,
      credit,
      creditUrl
    },
    author->{
      _id,
      name,
      slug,
      image
    },
    categories[]->{
      _id,
      title,
      slug
    },
    "readingTime": round(length(pt::text(body)) / 5 / 200)
  }
`;

/**
 * Get a single post by slug
 */
export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    body,
    publishedAt,
    featuredImage {
      asset->,
      alt,
      credit,
      creditUrl
    },
    author->{
      _id,
      name,
      slug,
      title,
      image,
      bio
    },
    categories[]->{
      _id,
      title,
      slug
    },
    seo {
      metaTitle,
      metaDescription,
      ogImage
    },
    "readingTime": round(length(pt::text(body)) / 5 / 200)
  }
`;

/**
 * Get all post slugs for static generation
 */
export const postSlugsQuery = groq`
  *[_type == "post" && status == "published"].slug.current
`;

/**
 * Get posts by category
 */
export const postsByCategoryQuery = groq`
  *[_type == "post" && status == "published" && $categorySlug in categories[]->slug.current] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    featuredImage {
      asset->,
      alt,
      credit,
      creditUrl
    },
    author->{
      _id,
      name,
      slug,
      image
    },
    categories[]->{
      _id,
      title,
      slug
    },
    "readingTime": round(length(pt::text(body)) / 5 / 200)
  }
`;

/**
 * Get recent posts (for sidebar, related posts, etc.)
 */
export const recentPostsQuery = groq`
  *[_type == "post" && status == "published"] | order(publishedAt desc) [0...$limit] {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    featuredImage {
      asset->,
      alt
    }
  }
`;

/**
 * Get related posts by category (excluding current post)
 */
export const relatedPostsQuery = groq`
  *[_type == "post" && status == "published" && _id != $currentPostId && count(categories[@._ref in $categoryIds]) > 0] | order(publishedAt desc) [0...$limit] {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    featuredImage {
      asset->,
      alt
    }
  }
`;

// ============================================================================
// Author Queries
// ============================================================================

/**
 * Get all authors
 */
export const authorsQuery = groq`
  *[_type == "author"] | order(name asc) {
    _id,
    name,
    slug,
    title,
    image,
    bio
  }
`;

/**
 * Get author by slug
 */
export const authorBySlugQuery = groq`
  *[_type == "author" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    title,
    image,
    bio,
    "posts": *[_type == "post" && status == "published" && author._ref == ^._id] | order(publishedAt desc) {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      featuredImage {
        asset->,
        alt
      }
    }
  }
`;

// ============================================================================
// Category Queries
// ============================================================================

/**
 * Get all categories
 */
export const categoriesQuery = groq`
  *[_type == "category"] | order(title asc) {
    _id,
    title,
    slug,
    description,
    "postCount": count(*[_type == "post" && status == "published" && references(^._id)])
  }
`;

/**
 * Get category by slug
 */
export const categoryBySlugQuery = groq`
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description
  }
`;

// ============================================================================
// Sitemap & Feed Queries
// ============================================================================

/**
 * Get all posts for sitemap
 */
export const sitemapPostsQuery = groq`
  *[_type == "post" && status == "published"] | order(publishedAt desc) {
    slug,
    publishedAt,
    _updatedAt
  }
`;

/**
 * Get posts for RSS feed
 */
export const rssFeedQuery = groq`
  *[_type == "post" && status == "published"] | order(publishedAt desc) [0...20] {
    title,
    slug,
    excerpt,
    publishedAt,
    author->{
      name
    }
  }
`;
