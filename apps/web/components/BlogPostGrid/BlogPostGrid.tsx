'use client';

import { useState } from 'react';
import PostCard from '@/components/PostCard/PostCard';
import type { Post } from '@/types';
import { cn } from '@/lib/utils';

type BlogPostGridProps = {
  posts: Post[];
  tags: string[];
};

const BlogPostGrid = ({ posts, tags }: BlogPostGridProps) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const featuredPost = posts.find((post) => post.meta.featured);
  const otherPosts = posts.filter((post) => !post.meta.featured);

  const filteredPosts = selectedTag
    ? posts.filter((post) => post.meta.tags.includes(selectedTag!))
    : otherPosts;

  return (
    <div>
      {/* Featured Post Section */}
      {featuredPost && !selectedTag && (
        <div className="mb-12 not-prose">
          <PostCard
            post={featuredPost}
            className="grid md:grid-cols-2 md:gap-8 items-center"
          />
        </div>
      )}

      {/* Tags Filter */}
      <div className="mb-8 flex flex-wrap justify-center gap-2 not-prose">
        <button
          type="button"
          onClick={() => setSelectedTag(null)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
            !selectedTag
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600',
          )}
        >
          All Posts
        </button>
        {tags.map((tag) => (
          <button
            type="button"
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
              selectedTag === tag
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600',
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Grid of Posts */}
      <div
        className={cn(
          'grid grid-cols-1 gap-8 not-prose',
          !featuredPost || selectedTag
            ? 'md:grid-cols-2 lg:grid-cols-3'
            : 'md:grid-cols-2',
        )}
      >
        {(selectedTag ? filteredPosts : otherPosts).map((post) => (
          <PostCard key={post.meta.slug} post={post} />
        ))}
      </div>
    </div>
  );
};

export default BlogPostGrid;
