'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/pro-solid-svg-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Post } from '@/types';
import { PLACEHOLDER_BLOG_IMAGE } from '@/constants';

type BlogPageClientProps = {
  posts: Post[];
  tags: string[];
};

const getTagColor = (tag: string) => {
  const tagLower = tag.toLowerCase();
  if (tagLower.includes('guide') || tagLower.includes('how')) {
    return 'bg-teal/10 text-teal';
  }
  if (tagLower.includes('news') || tagLower.includes('update')) {
    return 'bg-amber/10 text-amber';
  }
  if (tagLower.includes('success') || tagLower.includes('case')) {
    return 'bg-success/10 text-success';
  }
  if (tagLower.includes('legal') || tagLower.includes('law')) {
    return 'bg-coral/10 text-coral';
  }
  return 'bg-light text-gray';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const BlogPageClient = ({ posts, tags }: BlogPageClientProps) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = posts.filter((post) => {
    const matchesTag = !selectedTag || post.meta.tags.includes(selectedTag);
    const matchesSearch =
      searchQuery === '' ||
      post.meta.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.meta.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const featuredPost = posts.find((post) => post.meta.featured);
  const regularPosts = filteredPosts.filter(
    (post) => !post.meta.featured || selectedTag !== null || searchQuery !== '',
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-light px-4 pb-12 pt-8 md:pt-12">
        <div className="mx-auto max-w-5xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-balance text-4xl font-bold tracking-tight text-dark md:text-5xl"
          >
            Parking Ticket Advice & News
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-gray"
          >
            Expert guides, success stories, and the latest news on parking fines
            and appeals in the UK.
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-8 max-w-md"
          >
            <div className="relative">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray"
              />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-lg border-border bg-white pl-11 pr-4 text-base shadow-sm focus:border-teal focus:ring-teal"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tags Filter */}
      <section className="sticky top-[72px] z-30 border-b border-border bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedTag === null
                  ? 'bg-dark text-white'
                  : 'bg-transparent text-gray hover:bg-light hover:text-dark'
              }`}
            >
              All Posts
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-dark text-white'
                    : 'bg-transparent text-gray hover:bg-light hover:text-dark'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && selectedTag === null && searchQuery === '' && (
        <section className="px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <Link
              href={`/blog/${featuredPost.meta.slug}`}
              className="group block"
            >
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-6 md:grid-cols-2 md:gap-10"
              >
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-light">
                  {featuredPost.meta.image ? (
                    <Image
                      src={featuredPost.meta.image}
                      alt={featuredPost.meta.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={PLACEHOLDER_BLOG_IMAGE}
                      alt={featuredPost.meta.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute left-4 top-4">
                    <span className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white">
                      Featured
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col justify-center">
                  {featuredPost.meta.tags[0] && (
                    <span
                      className={`mb-3 inline-flex w-fit rounded-lg px-2.5 py-1 text-xs font-medium ${getTagColor(featuredPost.meta.tags[0])}`}
                    >
                      {featuredPost.meta.tags[0]}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-dark transition-colors group-hover:text-teal md:text-3xl">
                    {featuredPost.meta.title}
                  </h2>
                  <p className="mt-3 text-gray">{featuredPost.meta.summary}</p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-light font-medium text-dark">
                        {featuredPost.meta.author.name.charAt(0)}
                      </div>
                      <span>{featuredPost.meta.author.name}</span>
                    </div>
                    <span>{formatDate(featuredPost.meta.date)}</span>
                    <span>{featuredPost.readingTime}</span>
                  </div>
                </div>
              </motion.article>
            </Link>
          </div>
        </section>
      )}

      {/* Blog Grid */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          {regularPosts.length === 0 ? (
            <div className="py-16 text-center">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="mb-4 text-4xl text-gray/40"
              />
              <p className="text-lg text-gray">
                No articles found matching your search.
              </p>
              <Button
                variant="outline"
                className="mt-4 border-border bg-transparent text-dark hover:bg-light"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post, index) => (
                <motion.article
                  key={post.meta.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/blog/${post.meta.slug}`}
                    className="group block"
                  >
                    {/* Image */}
                    <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl bg-light">
                      {post.meta.image ? (
                        <Image
                          src={post.meta.image}
                          alt={post.meta.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Image
                          src={PLACEHOLDER_BLOG_IMAGE}
                          alt={post.meta.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>

                    {/* Content */}
                    {post.meta.tags[0] && (
                      <span
                        className={`mb-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${getTagColor(post.meta.tags[0])}`}
                      >
                        {post.meta.tags[0]}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-dark transition-colors group-hover:text-teal">
                      {post.meta.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-gray">
                      {post.meta.summary}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-sm text-gray">
                      <span>{formatDate(post.meta.date)}</span>
                      <span className="h-1 w-1 rounded-full bg-gray/40" />
                      <span>{post.readingTime}</span>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-light px-4 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-dark">Stay Updated</h2>
          <p className="mt-2 text-gray">
            Get the latest parking advice and news delivered to your inbox.
          </p>
          <form className="mt-6 flex gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-12 flex-1 rounded-lg border-border bg-white text-base"
            />
            <Button
              type="submit"
              className="h-12 bg-teal px-6 text-white hover:bg-teal-dark"
            >
              Subscribe
            </Button>
          </form>
          <p className="mt-3 text-xs text-gray">
            No spam, unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
};

export default BlogPageClient;
