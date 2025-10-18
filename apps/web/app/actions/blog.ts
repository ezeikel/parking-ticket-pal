'use server';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { put, list } from '@vercel/blob';
import {
  BLOG_CONTENT_PROMPT,
  BLOG_TOPICS,
  BLOG_TAGS,
  AUTHORS,
  STORAGE_PATHS,
  OPENAI_MODEL_GPT_4O,
  OPENAI_MODEL_GPT_IMAGE_OPTIONS,
  PLACEHOLDER_BLOG_IMAGE,
} from '@/constants';
import openai from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  BlogPostMetaSchema,
  type BlogPostMeta,
  type Post,
  type PostMeta,
} from '@/types';
import { notFound } from 'next/navigation';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'blog' });

const postsDirectory = path.join(process.cwd(), 'content/blog');

export const getPostBySlug = async (slug: string): Promise<Post> => {
  const realSlug = slug.replace(/\.mdx$/, '');

  // first, try to read from local file system
  const localPath = path.join(postsDirectory, `${realSlug}.mdx`);
  let fileContents: string;

  if (fs.existsSync(localPath)) {
    fileContents = fs.readFileSync(localPath, 'utf8');
  } else {
    // if not found locally, try blob storage
    const blobPath = STORAGE_PATHS.BLOG_POST.replace('%s', realSlug);
    try {
      const { blobs } = await list({ prefix: blobPath });

      if (blobs.length === 0) {
        notFound();
      }

      const response = await fetch(blobs[0].url);
      fileContents = await response.text();
    } catch (error) {
      logger.error('Error fetching blog post from blob storage', {
        slug: realSlug,
        blobPath
      }, error instanceof Error ? error : new Error(String(error)));
      notFound();
    }
  }

  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  // if post date is in the future, treat as not found
  // this prevents direct access to unpublished posts
  if (new Date(data.date) > new Date()) {
    notFound();
  }

  return {
    meta: { ...(data as PostMeta), slug: realSlug },
    content,
    readingTime: stats.text,
  };
};

export const getAllPosts = async (): Promise<Post[]> => {
  const allSlugs: Array<{ slug: string; date: string }> = [];

  // get posts from local file system
  if (fs.existsSync(postsDirectory)) {
    const localSlugs = fs.readdirSync(postsDirectory);
    const localPosts = localSlugs.map((slug) => {
      const realSlug = slug.replace(/\.mdx$/, '');
      const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      return { slug: realSlug, date: data.date };
    });
    allSlugs.push(...localPosts);
  }

  // get posts from blob storage
  try {
    const { blobs } = await list({ prefix: 'blog/' });
    const blobPosts = await Promise.all(
      blobs.map(async (blob) => {
        const response = await fetch(blob.url);
        const content = await response.text();
        const { data } = matter(content);
        const slug = blob.pathname.replace('blog/', '').replace('.mdx', '');
        return { slug, date: data.date };
      }),
    );
    allSlugs.push(...blobPosts);
  } catch (error) {
    logger.error('Error fetching blog posts from blob storage', {}, error instanceof Error ? error : new Error(String(error)));
  }

  // remove duplicates (prefer local files over blob storage)
  const uniqueSlugs = allSlugs.filter(
    (post, index, self) =>
      index === self.findIndex((p) => p.slug === post.slug),
  );

  const posts = await Promise.all(
    uniqueSlugs
      // filter out posts with a future date
      .filter((post) => new Date(post.date) <= new Date())
      // get the full post data for the remaining posts
      .map((post) => getPostBySlug(post.slug)),
  );

  // sort them
  return posts.sort((post1, post2) =>
    new Date(post1.meta.date) > new Date(post2.meta.date) ? -1 : 1,
  );
};

/**
 * Get list of already covered topics from existing blog posts
 */
export const getCoveredTopics = async (): Promise<string[]> => {
  try {
    const posts = await getAllPosts();
    return posts.map((post) => post.meta.slug);
  } catch (error) {
    logger.error('Error getting covered topics', {}, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
};

/**
 * Generate a unique slug from title
 */
const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/-+/g, '-') // replace multiple hyphens with single
    .trim();

/**
 * Generate blog post metadata using OpenAI structured outputs
 */
const generateBlogMeta = async (topic: string): Promise<BlogPostMeta> => {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_GPT_4O,
    messages: [
      {
        role: 'system',
        content: `You are a content strategist for a UK parking and traffic law website. Generate SEO-optimized blog post metadata for the given topic. Focus on UK-specific terminology, councils, laws, and procedures. 

Choose the most relevant tags from this predefined list: ${BLOG_TAGS.join(', ')}.

Select 3-5 tags that best match the topic and would help users find this content.`,
      },
      {
        role: 'user',
        content: `Generate blog post metadata for: "${topic}"`,
      },
    ],
    response_format: zodResponseFormat(BlogPostMetaSchema, 'blog_post_meta'),
    temperature: 0.7,
  });

  const result = completion.choices[0]?.message?.content;
  if (!result) {
    throw new Error('Failed to generate blog metadata');
  }

  return BlogPostMetaSchema.parse(JSON.parse(result));
};

/**
 * Generate a photo-realistic blog image using OpenAI DALL-E
 */
const generateBlogImage = async (
  title: string,
  summary: string,
  slug: string,
): Promise<string> => {
  const imagePrompt = `A high-quality, photo-realistic image representing "${title}". ${summary}. 
  
  Style requirements:
  - Photo-realistic, professional quality
  - High resolution and sharp detail
  - Natural lighting and composition
  - Avoid obvious AI-generated artifacts
  - Focus on UK context where relevant
  - Clean, engaging visual that would work as a blog header
  
  CRITICAL: Absolutely no text, words, letters, numbers, signs with readable text, or any written content in the image. No street signs with text, no license plates with readable numbers, no building signs, no documents with visible text, no computer screens with text, no printed materials. Focus purely on visual elements without any textual components.
  
  Subject matter should relate to UK parking, traffic enforcement, or legal themes in a professional, documentary style but without any readable text elements.`;

  try {
    const response = await openai.images.generate({
      ...OPENAI_MODEL_GPT_IMAGE_OPTIONS,
      prompt: imagePrompt,
    });

    const { b64_json: base64Image } = (
      response.data as { b64_json: string }[]
    )[0];

    // convert base64 to buffer for storage
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // store in blob storage
    const imagePath = `blog/images/${slug}.png`;
    const blob = await put(imagePath, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    return blob.url;
  } catch (error) {
    logger.error('Error generating blog image', {
      title,
      slug
    }, error instanceof Error ? error : new Error(String(error)));
    // fallback to a default image if generation fails
    return PLACEHOLDER_BLOG_IMAGE;
  }
};

/**
 * Create system prompt for blog content generation
 */
const createContentPrompt = (
  meta: BlogPostMeta,
  existingPosts: string[],
): string =>
  BLOG_CONTENT_PROMPT.replace('{{TITLE}}', meta.title)
    .replace('{{SUMMARY}}', meta.summary)
    .replace('{{KEYWORDS}}', meta.tags.join(', '))
    .replace('{{CATEGORY}}', meta.category)
    .replace('{{EXISTING_POSTS}}', existingPosts.join(', '));

/**
 * Generate blog post content using OpenAI
 */
const generateBlogContent = async (
  meta: BlogPostMeta,
  existingPosts: string[],
): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL_GPT_4O,
    messages: [
      {
        role: 'system',
        content: createContentPrompt(meta, existingPosts),
      },
      {
        role: 'user',
        content: `Write a comprehensive blog post with the title: "${meta.title}"\n\nKey topics to cover: ${meta.tags.join(', ')}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  return completion.choices[0]?.message?.content || '';
};

/**
 * Create frontmatter for the blog post
 */
const createFrontmatter = (
  meta: BlogPostMeta,
  content: string,
  imageUrl: string,
  publishDate?: Date,
): Record<string, any> => {
  const author = AUTHORS[Math.floor(Math.random() * AUTHORS.length)];

  // use provided date or default to current run time
  const date = publishDate ?? new Date();

  // calculate reading time from actual content
  const readingStats = readingTime(content);

  return {
    title: meta.title,
    date: date.toISOString().split('T')[0], // YYYY-MM-DD format
    author,
    summary: meta.summary,
    image: imageUrl,
    tags: meta.tags.slice(0, 3), // limit to 3 tags
    featured: Math.random() > 0.8, // 20% chance for featured posts
    readingTime: readingStats.text,
  };
};

/**
 * Save blog post to Vercel Blob storage
 */
const saveBlogPost = async (
  slug: string,
  frontmatter: Record<string, any>,
  content: string,
): Promise<void> => {
  const fullContent = matter.stringify(content, frontmatter);
  const blobPath = STORAGE_PATHS.BLOG_POST.replace('%s', slug);

  await put(blobPath, fullContent, {
    access: 'public',
    contentType: 'text/plain',
  });
};

/**
 * Generate and save a blog post for any topic
 */
export const generateBlogPostForTopic = async (
  topic: string,
  publishDate?: Date,
): Promise<{
  slug: string;
  title: string;
  success: boolean;
  error?: string;
}> => {
  try {
    logger.info('Generating blog post for topic', { topic });

    // generate metadata using OpenAI structured outputs
    const meta = await generateBlogMeta(topic);
    const slug = generateSlug(meta.title);

    // check if this specific slug already exists in blob storage
    try {
      const blobPath = STORAGE_PATHS.BLOG_POST.replace('%s', slug);
      const { blobs } = await list({ prefix: blobPath });
      if (blobs.length > 0) {
        throw new Error(`Post with slug "${slug}" already exists`);
      }
    } catch {
      // if list fails, assume post doesn't exist and continue
    }

    // get existing posts to avoid duplication
    const coveredTopics = await getCoveredTopics();

    // generate content
    logger.info('Generating content for blog post', { title: meta.title, slug });
    const content = await generateBlogContent(meta, coveredTopics);

    if (!content) {
      throw new Error('Failed to generate content');
    }

    // generate custom image for the blog post
    logger.info('Generating image for blog post', { title: meta.title, slug });
    const imageUrl = await generateBlogImage(meta.title, meta.summary, slug);

    // create frontmatter with calculated reading time and generated image
    const frontmatter = createFrontmatter(meta, content, imageUrl, publishDate);

    // save the post
    await saveBlogPost(slug, frontmatter, content);

    logger.info('Successfully generated blog post', { slug, title: meta.title });

    return {
      slug,
      title: meta.title,
      success: true,
    };
  } catch (error) {
    logger.error('Error generating blog post', {
      topic
    }, error instanceof Error ? error : new Error(String(error)));
    return {
      slug: '',
      title: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Generate a random blog post topic for cron jobs
 */
const getRandomTopic = (): string =>
  BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)];

/**
 * Generate a random blog post (for cron jobs)
 */
export const generateRandomBlogPost = async (
  publishDate?: Date,
): Promise<{
  slug: string;
  title: string;
  success: boolean;
  error?: string;
}> => {
  const randomTopic = getRandomTopic();
  return generateBlogPostForTopic(randomTopic, publishDate);
};
