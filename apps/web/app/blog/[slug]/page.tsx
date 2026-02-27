import { notFound } from 'next/navigation';
import {
  getAllPostSlugs,
  getPostBySlug,
  getAllPosts,
} from '@/lib/queries/blog';
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
  return {
    title: `${post.meta.title} | Parking Ticket Pal`,
    description: post.meta.summary,
    openGraph: {
      type: 'article',
      publishedTime: post.meta.date,
      authors: [post.meta.author.name],
      tags: post.meta.tags,
    },
    twitter: {
      card: 'summary_large_image',
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

  const postUrl = `https://parkingticketpal.co.uk/blog/${slug}`;

  return (
    <>
      <JsonLd
        data={createArticleSchema({
          title: post.meta.title,
          description: post.meta.summary,
          url: postUrl,
          datePublished: post.meta.date,
          dateModified: post.meta.date,
        })}
      />
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: 'https://parkingticketpal.co.uk' },
          { name: 'Blog', url: 'https://parkingticketpal.co.uk/blog' },
          { name: post.meta.title, url: postUrl },
        ])}
      />
      <BlogPostClient post={post} relatedPosts={relatedPosts} />
    </>
  );
};

export default BlogPostPage;
