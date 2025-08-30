import { getAllPosts } from '@/app/actions/blog';
import BlogPostGrid from '@/components/BlogPostGrid/BlogPostGrid';

export const revalidate = 3600; // revalidate every hour

const BlogIndexPage = async () => {
  const posts = await getAllPosts();
  const allTags = Array.from(new Set(posts.flatMap((post) => post.meta.tags)));

  return (
    <div className="bg-gray-50/50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            The Parking Ticket Pal Blog
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
            Your expert guide to navigating parking fines, understanding your
            rights, and winning appeals.
          </p>
        </header>

        <BlogPostGrid posts={posts} tags={allTags} />
      </div>
    </div>
  );
};

export default BlogIndexPage;
