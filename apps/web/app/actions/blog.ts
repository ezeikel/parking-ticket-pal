'use server';

import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/ai/models';
import {
  BLOG_META_PROMPT,
  BLOG_CONTENT_PROMPT,
  BLOG_IMAGE_SEARCH_PROMPT,
  BLOG_IMAGE_GENERATION_PROMPT,
} from '@/lib/ai/prompts';
import { writeClient } from '@/lib/sanity/client';
import {
  fetchBlogPhoto,
  downloadPhoto,
  formatPhotoCredit,
  type PexelsPhoto,
} from '@/lib/pexels/client';
import { BLOG_TOPICS, BLOG_TAGS } from '@/constants';
import { createServerLogger } from '@/lib/logger';
import { getCoveredTopics } from '@/lib/queries/blog';

const logger = createServerLogger({ action: 'blog' });

// Types
interface BlogPostMeta {
  title: string;
  slug: string;
  excerpt: string;
  keywords: string[];
  category: string;
}

interface ImageSearchTerms {
  searchTerms: string[];
  altText: string;
  style: string;
}

interface FeaturedImage {
  asset: { _type: 'reference'; _ref: string };
  alt: string;
  credit?: string;
  creditUrl?: string;
}

interface PexelsSearchResult {
  photo: PexelsPhoto | null;
  searchTerm: string;
  allPhotos?: PexelsPhoto[];
}

// Zod schemas for structured output
const BlogMetaSchema = z.object({
  title: z.string().describe('SEO-optimized title'),
  slug: z.string().describe('URL-friendly slug'),
  excerpt: z.string().describe('Compelling meta description'),
  keywords: z.array(z.string()).describe('Relevant keywords'),
  category: z.string().describe('Blog category'),
});

const ImageSearchSchema = z.object({
  searchTerms: z.array(z.string()).describe('Search terms for stock photos'),
  altText: z.string().describe('Descriptive alt text'),
  style: z.string().describe('Photographic style preference'),
});

/**
 * Generate a unique slug from title
 */
const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

/**
 * Generate blog post metadata using AI structured outputs
 */
const generateBlogMeta = async (topic: string): Promise<BlogPostMeta> => {
  const prompt = BLOG_META_PROMPT.replace('{{TOPIC}}', topic);

  const { object: meta } = await generateObject({
    model: models.text,
    schema: BlogMetaSchema,
    prompt,
    temperature: 0.7,
  });

  // Ensure slug is clean
  meta.slug = generateSlug(meta.title);

  return meta;
};

/**
 * Generate image search terms for Pexels
 */
const generateImageSearchTerms = async (
  title: string,
  excerpt: string,
  category: string,
): Promise<ImageSearchTerms> => {
  const prompt = BLOG_IMAGE_SEARCH_PROMPT.replace('{{TITLE}}', title)
    .replace('{{EXCERPT}}', excerpt)
    .replace('{{CATEGORY}}', category);

  const { object: searchTerms } = await generateObject({
    model: models.textFast,
    schema: ImageSearchSchema,
    prompt,
    temperature: 0.7,
  });

  return searchTerms;
};

/**
 * Search Pexels for blog images (returns all results for review)
 */
export const searchBlogImages = async (
  searchTerms: string[],
): Promise<PexelsSearchResult & { allPhotos: PexelsPhoto[] }> => {
  const result = await fetchBlogPhoto(searchTerms, {
    orientation: 'landscape',
    size: 'large',
  });

  // For manual review, we want all results from the first successful search
  // This requires modifying the search to return all photos
  // For now, return the selected photo and suggest user can search again
  return {
    ...result,
    allPhotos: result.photo ? [result.photo] : [],
  };
};

/**
 * Generate image with Gemini when Pexels doesn't have suitable options
 */
const generateImageWithGemini = async (
  title: string,
): Promise<{ buffer: Buffer; mimeType: string }> => {
  const prompt = BLOG_IMAGE_GENERATION_PROMPT.replace('{{TITLE}}', title);

  // Gemini image generation returns images via generateText with special response
  const { text: imageData } = await generateText({
    model: models.geminiImage,
    prompt: `Generate an image: ${prompt}. Return the image data as base64.`,
  });

  // Parse the response - Gemini returns base64 image data
  // Note: The actual format depends on how @ai-sdk/google handles image generation
  const buffer = Buffer.from(imageData, 'base64');

  return {
    buffer,
    mimeType: 'image/png',
  };
};

/**
 * Upload image to Sanity from buffer
 */
const uploadImageToSanity = async (
  buffer: Buffer,
  filename: string,
): Promise<{ _type: 'reference'; _ref: string }> => {
  const asset = await writeClient.assets.upload('image', buffer, {
    filename,
  });

  return {
    _type: 'reference',
    _ref: asset._id,
  };
};

/**
 * Get featured image from Pexels or Gemini
 * Returns the image asset and metadata for Sanity
 */
const getFeaturedImage = async (
  title: string,
  excerpt: string,
  category: string,
  slug: string,
): Promise<FeaturedImage | null> => {
  try {
    // 1. Generate search terms
    logger.info('Generating image search terms', { title });
    const searchTerms = await generateImageSearchTerms(title, excerpt, category);

    // 2. Try Pexels first
    logger.info('Searching Pexels for image', { searchTerms: searchTerms.searchTerms });
    const pexelsResult = await fetchBlogPhoto(searchTerms.searchTerms, {
      orientation: 'landscape',
      size: 'large',
    });

    if (pexelsResult.photo) {
      logger.info('Found Pexels image', {
        searchTerm: pexelsResult.searchTerm,
        photographer: pexelsResult.photo.photographer,
      });

      // Download and upload to Sanity
      const buffer = await downloadPhoto(pexelsResult.photo, 'large2x');
      const assetRef = await uploadImageToSanity(buffer, `${slug}-featured.jpg`);
      const credit = formatPhotoCredit(pexelsResult.photo);

      return {
        asset: assetRef,
        alt: searchTerms.altText,
        credit: credit.credit,
        creditUrl: credit.creditUrl,
      };
    }

    // 3. Fallback to Gemini image generation
    logger.info('No Pexels image found, falling back to Gemini', { title });
    try {
      const geminiResult = await generateImageWithGemini(title);
      const assetRef = await uploadImageToSanity(
        geminiResult.buffer,
        `${slug}-featured-generated.png`,
      );

      return {
        asset: assetRef,
        alt: searchTerms.altText,
        credit: 'Generated with AI',
      };
    } catch (geminiError) {
      logger.warn('Gemini image generation failed', {
        title,
        error: geminiError instanceof Error ? geminiError.message : String(geminiError),
      });
      return null;
    }
  } catch (error) {
    logger.error('Error getting featured image', {
      title,
    }, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

/**
 * Create blog content prompt with existing posts context
 */
const createContentPrompt = (
  meta: BlogPostMeta,
  existingPosts: string[],
): string =>
  BLOG_CONTENT_PROMPT.replace('{{TITLE}}', meta.title)
    .replace('{{SUMMARY}}', meta.excerpt)
    .replace('{{KEYWORDS}}', meta.keywords.join(', '))
    .replace('{{CATEGORY}}', meta.category)
    .replace('{{EXISTING_POSTS}}', existingPosts.join(', '));

/**
 * Generate blog post content using AI
 */
const generateBlogContent = async (
  meta: BlogPostMeta,
  existingPosts: string[],
): Promise<string> => {
  const contentPrompt = createContentPrompt(meta, existingPosts);

  const { text: content } = await generateText({
    model: models.text,
    system: 'You are a professional content writer specializing in UK parking and traffic law.',
    prompt: contentPrompt,
    temperature: 0.7,
  });

  return content;
};

/**
 * Convert Markdown to Sanity Portable Text blocks
 * Simplified converter - handles common markdown patterns
 */
function markdownToPortableText(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split('\n');
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';
  let inList = false;
  let listType: 'bullet' | 'number' = 'bullet';
  let listItems: any[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        blocks.push({
          _type: 'block',
          _key: `block-${blocks.length}`,
          style: 'normal',
          markDefs: [],
          children: [{ _type: 'span', _key: 'span-0', text, marks: [] }],
        });
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(...listItems);
      listItems = [];
      inList = false;
    }
  };

  for (const line of lines) {
    // Code block start/end
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          _type: 'code',
          _key: `code-${blocks.length}`,
          language: codeLanguage || 'text',
          code: codeContent.join('\n'),
        });
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        codeLanguage = line.slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      flushList();
      const level = headerMatch[1].length;
      blocks.push({
        _type: 'block',
        _key: `block-${blocks.length}`,
        style: `h${level}`,
        markDefs: [],
        children: [{ _type: 'span', _key: 'span-0', text: headerMatch[2], marks: [] }],
      });
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!inList || listType !== 'bullet') {
        flushList();
        inList = true;
        listType = 'bullet';
      }
      listItems.push({
        _type: 'block',
        _key: `list-${blocks.length + listItems.length}`,
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [],
        children: [{ _type: 'span', _key: 'span-0', text: bulletMatch[1], marks: [] }],
      });
      continue;
    }

    // Numbered list
    const numberMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberMatch) {
      flushParagraph();
      if (!inList || listType !== 'number') {
        flushList();
        inList = true;
        listType = 'number';
      }
      listItems.push({
        _type: 'block',
        _key: `list-${blocks.length + listItems.length}`,
        style: 'normal',
        listItem: 'number',
        level: 1,
        markDefs: [],
        children: [{ _type: 'span', _key: 'span-0', text: numberMatch[1], marks: [] }],
      });
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push({
        _type: 'block',
        _key: `block-${blocks.length}`,
        style: 'blockquote',
        markDefs: [],
        children: [{ _type: 'span', _key: 'span-0', text: line.slice(2), marks: [] }],
      });
      continue;
    }

    flushList();
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/**
 * Create post in Sanity
 */
const createSanityPost = async (
  meta: BlogPostMeta,
  body: any[],
  featuredImage: FeaturedImage | null,
  publishDate?: Date,
): Promise<string> => {
  // Get or create a default author
  let authorRef = await writeClient.fetch(
    `*[_type == "author"][0]._id`,
  );

  // If no author exists, skip author reference
  if (!authorRef) {
    logger.warn('No author found in Sanity, creating post without author');
  }

  // Get category references
  const categoryRefs: Array<{ _type: 'reference'; _ref: string; _key: string }> = [];
  for (const keyword of meta.keywords.slice(0, 3)) {
    const existingTag = BLOG_TAGS.find(
      (tag) => tag.toLowerCase() === keyword.toLowerCase(),
    );
    if (existingTag) {
      const catId = await writeClient.fetch(
        `*[_type == "category" && title == $title][0]._id`,
        { title: existingTag },
      );
      if (catId) {
        categoryRefs.push({
          _type: 'reference',
          _ref: catId,
          _key: `cat-${categoryRefs.length}`,
        });
      }
    }
  }

  const doc: any = {
    _type: 'post',
    title: meta.title,
    slug: { _type: 'slug', current: meta.slug },
    excerpt: meta.excerpt,
    body,
    publishedAt: (publishDate ?? new Date()).toISOString(),
    status: 'published',
  };

  if (authorRef) {
    doc.author = { _type: 'reference', _ref: authorRef };
  }

  if (categoryRefs.length > 0) {
    doc.categories = categoryRefs;
  }

  if (featuredImage) {
    doc.featuredImage = {
      _type: 'image',
      asset: featuredImage.asset,
      alt: featuredImage.alt,
      credit: featuredImage.credit,
      creditUrl: featuredImage.creditUrl,
    };
  }

  const result = await writeClient.create(doc);
  return result._id;
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

    // 1. Generate metadata
    const meta = await generateBlogMeta(topic);
    logger.info('Generated metadata', { title: meta.title, slug: meta.slug });

    // 2. Check if post with this slug exists
    const existingPost = await writeClient.fetch(
      `*[_type == "post" && slug.current == $slug][0]._id`,
      { slug: meta.slug },
    );

    if (existingPost) {
      throw new Error(`Post with slug "${meta.slug}" already exists`);
    }

    // 3. Get existing posts to avoid duplication
    const coveredTopics = await getCoveredTopics();

    // 4. Generate content
    logger.info('Generating content', { title: meta.title });
    const content = await generateBlogContent(meta, coveredTopics);

    if (!content) {
      throw new Error('Failed to generate content');
    }

    // 5. Get featured image (Pexels first, then Gemini)
    logger.info('Getting featured image', { title: meta.title });
    const featuredImage = await getFeaturedImage(
      meta.title,
      meta.excerpt,
      meta.category,
      meta.slug,
    );

    // 6. Convert content to Portable Text
    const portableText = markdownToPortableText(content);

    // 7. Create post in Sanity
    logger.info('Creating post in Sanity', { title: meta.title });
    await createSanityPost(meta, portableText, featuredImage, publishDate);

    logger.info('Successfully generated blog post', { slug: meta.slug, title: meta.title });

    return {
      slug: meta.slug,
      title: meta.title,
      success: true,
    };
  } catch (error) {
    logger.error('Error generating blog post', {
      topic,
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

/**
 * Preview Pexels images for a topic before generating a post
 * Allows user to review images and optionally regenerate with Gemini
 */
export const previewBlogImages = async (
  topic: string,
): Promise<{
  searchTerms: string[];
  photos: Array<{
    id: number;
    url: string;
    photographer: string;
    photographerUrl: string;
    alt: string;
  }>;
  error?: string;
}> => {
  try {
    // Generate metadata to get search terms
    const meta = await generateBlogMeta(topic);
    const searchTerms = await generateImageSearchTerms(
      meta.title,
      meta.excerpt,
      meta.category,
    );

    // Search Pexels with all terms
    const results = await fetchBlogPhoto(searchTerms.searchTerms, {
      orientation: 'landscape',
      size: 'large',
    });

    if (results.photo) {
      // For now return the single photo; could be extended to return multiple
      return {
        searchTerms: searchTerms.searchTerms,
        photos: [
          {
            id: results.photo.id,
            url: results.photo.src.large2x,
            photographer: results.photo.photographer,
            photographerUrl: results.photo.photographer_url,
            alt: results.photo.alt || searchTerms.altText,
          },
        ],
      };
    }

    return {
      searchTerms: searchTerms.searchTerms,
      photos: [],
      error: 'No suitable photos found',
    };
  } catch (error) {
    return {
      searchTerms: [],
      photos: [],
      error: error instanceof Error ? error.message : 'Failed to preview images',
    };
  }
};
