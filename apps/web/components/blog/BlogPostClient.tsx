'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faClock,
  faArrowLeft,
  faLink,
} from '@fortawesome/pro-solid-svg-icons';
import {
  faXTwitter,
  faLinkedinIn,
  faFacebookF,
} from '@fortawesome/free-brands-svg-icons';
import { Button } from '@/components/ui/button';
import PortableText from '@/components/PortableText/PortableText';
import type { Post } from '@/types';
import type { PortableTextBlock } from '@portabletext/types';
import { PLACEHOLDER_AVATAR_IMAGE } from '@/constants';

type RelatedPost = {
  slug: string;
  title: string;
};

type BlogPostClientProps = {
  post: Post & { bodyBlocks: PortableTextBlock[] };
  relatedPosts?: RelatedPost[];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

const copyToClipboard = () => {
  if (typeof window !== 'undefined') {
    navigator.clipboard.writeText(window.location.href);
  }
};

const shareOnTwitter = (title: string) => {
  if (typeof window !== 'undefined') {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    window.open(
      `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      '_blank',
    );
  }
};

const shareOnLinkedIn = () => {
  if (typeof window !== 'undefined') {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
    );
  }
};

const shareOnFacebook = () => {
  if (typeof window !== 'undefined') {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
    );
  }
};

const BlogPostClient = ({ post, relatedPosts = [] }: BlogPostClientProps) => {
  const { meta, bodyBlocks, readingTime } = post;

  return (
    <div className="min-h-screen bg-white">
      {/* Article Header */}
      <article className="px-4 pb-16 pt-8 md:pt-12">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex items-center gap-2 text-sm text-gray"
          >
            <Link href="/blog" className="transition-colors hover:text-dark">
              Blog
            </Link>
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            <span className="text-dark">{meta.tags[0] || 'Article'}</span>
          </motion.nav>

          {/* Category Badge */}
          {meta.tags[0] && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 inline-flex rounded-lg px-3 py-1 text-sm font-medium ${getTagColor(meta.tags[0])}`}
            >
              {meta.tags[0]}
            </motion.span>
          )}

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-balance text-3xl font-bold tracking-tight text-dark md:text-4xl lg:text-5xl"
          >
            {meta.title}
          </motion.h1>

          {/* Excerpt */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 text-lg text-gray"
          >
            {meta.summary}
          </motion.p>

          {/* Meta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex flex-wrap items-center gap-4 border-b border-border pb-6"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-light">
                {meta.author.avatar ? (
                  <Image
                    src={meta.author.avatar}
                    alt={meta.author.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Image
                    src={PLACEHOLDER_AVATAR_IMAGE}
                    alt={meta.author.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div>
                <p className="font-medium text-dark">{meta.author.name}</p>
                <p className="text-sm text-gray">{formatDate(meta.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray">
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faClock} />
                {readingTime}
              </span>
            </div>
          </motion.div>

          {/* Share buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 flex items-center gap-3"
          >
            <span className="text-sm text-gray">Share:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => shareOnTwitter(meta.title)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-light text-gray transition-colors hover:bg-dark hover:text-white"
              >
                <FontAwesomeIcon icon={faXTwitter} className="text-sm" />
              </button>
              <button
                type="button"
                onClick={shareOnLinkedIn}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-light text-gray transition-colors hover:bg-dark hover:text-white"
              >
                <FontAwesomeIcon icon={faLinkedinIn} className="text-sm" />
              </button>
              <button
                type="button"
                onClick={shareOnFacebook}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-light text-gray transition-colors hover:bg-dark hover:text-white"
              >
                <FontAwesomeIcon icon={faFacebookF} className="text-sm" />
              </button>
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-light text-gray transition-colors hover:bg-dark hover:text-white"
              >
                <FontAwesomeIcon icon={faLink} className="text-sm" />
              </button>
            </div>
          </motion.div>

          {/* Featured Image */}
          {meta.image && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 relative aspect-[16/9] overflow-hidden rounded-xl"
            >
              <Image
                src={meta.image}
                alt={meta.title}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="prose prose-lg mt-10 max-w-none prose-headings:font-bold prose-headings:text-dark prose-h2:mt-10 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-p:text-gray prose-a:text-teal prose-a:no-underline hover:prose-a:underline prose-strong:text-dark prose-blockquote:border-l-teal prose-blockquote:bg-light prose-blockquote:py-4 prose-blockquote:pr-4 prose-blockquote:not-italic prose-blockquote:text-dark prose-li:text-gray prose-li:marker:text-teal"
          >
            <PortableText value={bodyBlocks} />
          </motion.div>

          {/* Author Bio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 rounded-xl bg-light p-6"
          >
            <div className="flex items-start gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white">
                {meta.author.avatar ? (
                  <Image
                    src={meta.author.avatar}
                    alt={meta.author.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Image
                    src={PLACEHOLDER_AVATAR_IMAGE}
                    alt={meta.author.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-gray">Written by</p>
                <p className="font-semibold text-dark">{meta.author.name}</p>
                {meta.author.title && (
                  <p className="mt-1 text-sm text-gray">{meta.author.title}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-12 rounded-xl bg-dark p-8 text-center"
          >
            <h3 className="text-2xl font-bold text-white">
              Ready to Challenge Your Ticket?
            </h3>
            <p className="mx-auto mt-2 max-w-md text-white/70">
              Let our AI analyse your PCN and generate a professional appeal
              letter in minutes.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 bg-teal text-white hover:bg-teal-dark"
            >
              <Link href="/">Start Free Appeal</Link>
            </Button>
          </motion.div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12"
            >
              <h3 className="mb-6 text-xl font-bold text-dark">
                Related Articles
              </h3>
              <div className="grid gap-4">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="group flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-light"
                  >
                    <span className="font-medium text-dark transition-colors group-hover:text-teal">
                      {related.title}
                    </span>
                    <FontAwesomeIcon
                      icon={faArrowLeft}
                      className="rotate-180 text-gray transition-transform group-hover:translate-x-1 group-hover:text-teal"
                    />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Back to Blog */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-12 text-center"
          >
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray transition-colors hover:text-dark"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to all articles
            </Link>
          </motion.div>
        </div>
      </article>
    </div>
  );
};

export default BlogPostClient;
