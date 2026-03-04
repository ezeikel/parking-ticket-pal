import { notFound } from 'next/navigation';
import {
  getAllPostSlugs,
  getPostBySlug,
  getAllPosts,
} from '@/lib/queries/blog';
import { SITE_URL } from '@/constants';
import BlogPostClient from '@/components/blog/BlogPostClient';
import JsonLd, {
  createArticleSchema,
  createBreadcrumbSchema,
} from '@/components/JsonLd/JsonLd';

// Pre-generate all published blog posts at build time
export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  // Return placeholder if no posts exist to satisfy Cache Components validation
  if (slugs.length === 0) {
    return [{ slug: 'placeholder' }];
  }
  return slugs.map((slug) => ({ slug }));
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return {};
  }

  const title =
    post.seo?.metaTitle ?? `${post.meta.title} | Parking Ticket Pal`;
  const description = post.seo?.metaDescription ?? post.meta.summary;

  return {
    title,
    description,
    keywords: post.meta.tags,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      type: 'article',
      title,
      description,
      publishedTime: post.meta.date,
      authors: [post.meta.author.name],
      tags: post.meta.tags,
      ...(post.meta.image && {
        images: [{ url: post.meta.image }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(post.meta.image && {
        images: [post.meta.image],
      }),
    },
  };
};

const BlogPostPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Get related posts (same tags, excluding current post)
  const allPosts = await getAllPosts();
  const relatedPosts = allPosts
    .filter(
      (p) =>
        p.meta.slug !== slug &&
        p.meta.tags.some((tag) => post.meta.tags.includes(tag)),
    )
    .slice(0, 3)
    .map((p) => ({ slug: p.meta.slug, title: p.meta.title }));

  const postUrl = `${SITE_URL}/blog/${slug}`;

  return (
    <>
      <JsonLd
        data={createArticleSchema({
          title: post.meta.title,
          description: post.meta.summary,
          url: postUrl,
          datePublished: post.meta.date,
          dateModified: post.meta.date,
          authorName: post.meta.author.name,
          image: post.meta.image,
          keywords: post.meta.tags,
        })}
      />
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'Blog', url: `${SITE_URL}/blog` },
          { name: post.meta.title, url: postUrl },
        ])}
      />
      <BlogPostClient post={post} relatedPosts={relatedPosts} />
    </>
  );
};

export default BlogPostPage;
