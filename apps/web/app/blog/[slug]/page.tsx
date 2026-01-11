import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/pro-regular-svg-icons';
import { getAllPosts, getPostBySlug } from '@/lib/queries/blog';
import PortableText from '@/components/PortableText/PortableText';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PLACEHOLDER_AVATAR_IMAGE, PLACEHOLDER_BLOG_IMAGE } from '@/constants';

// Allow dynamic routes even when generateStaticParams returns empty
export const dynamicParams = true;

export const generateStaticParams = async () => {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.meta.slug,
  }));
};

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

  const { meta, bodyBlocks, readingTime } = post;

  return (
    <div className="bg-white dark:bg-gray-950">
      <article className="relative">
        {/* Hero Section */}
        <header className="relative h-[40vh] md:h-[50vh] w-full">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-10" />
          <Image
            src={meta.image || PLACEHOLDER_BLOG_IMAGE}
            alt={meta.title}
            fill
            className="object-cover"
            priority
          />
          <div className="relative h-full flex flex-col justify-end p-6 md:p-12 text-white z-20">
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex flex-wrap gap-2 mb-4">
                {meta.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-white/20 text-white border-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-bold !leading-tight tracking-tight text-white">
                {meta.title}
              </h1>
              <div className="mt-6 flex items-center gap-4">
                <Avatar className="size-12">
                  <AvatarImage
                    src={meta.author.avatar || PLACEHOLDER_AVATAR_IMAGE}
                    alt={meta.author.name}
                  />
                  <AvatarFallback>{meta.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{meta.author.name}</p>
                  <p className="text-sm text-gray-300">
                    <time dateTime={meta.date}>
                      {new Date(meta.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span className="mx-2">&bull;</span>
                    <span>{readingTime}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="prose dark:prose-invert lg:prose-xl max-w-4xl mx-auto px-6 py-12 md:py-16">
          <PortableText value={bodyBlocks} />
        </div>
      </article>

      {/* Sticky Back Button */}
      <div className="sticky bottom-6 w-full flex justify-center pointer-events-none">
        <Link
          href="/blog"
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 bg-background/80 dark:bg-gray-800/80 backdrop-blur-sm border rounded-full shadow-lg hover:bg-accent transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to all posts</span>
        </Link>
      </div>
    </div>
  );
};

export default BlogPostPage;
