import { getAllPosts } from '@/lib/queries/blog';
import BlogPageClient from '@/components/blog/BlogPageClient';

const BlogIndexPage = async () => {
  const posts = await getAllPosts();
  const allTags = Array.from(new Set(posts.flatMap((post) => post.meta.tags)));

  return <BlogPageClient posts={posts} tags={allTags} />;
};

export default BlogIndexPage;
