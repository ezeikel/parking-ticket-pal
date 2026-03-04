import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/queries/blog';
import BlogPageClient from '@/components/blog/BlogPageClient';

export const metadata: Metadata = {
  title:
    'Parking Ticket Blog | Tips, News & Appeal Guides | Parking Ticket Pal',
  description:
    'Read the latest parking ticket news, appeal tips, tribunal case studies, and expert guides. Stay informed about UK parking enforcement and your rights as a motorist.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Parking Ticket Blog | Parking Ticket Pal',
    description:
      'The latest parking ticket news, appeal tips, and expert guides for UK motorists.',
    type: 'website',
  },
};

const BlogIndexPage = async () => {
  const posts = await getAllPosts();
  const allTags = Array.from(new Set(posts.flatMap((post) => post.meta.tags)));

  return <BlogPageClient posts={posts} tags={allTags} />;
};

export default BlogIndexPage;
