/* eslint-disable no-underscore-dangle, no-restricted-syntax, no-continue, no-await-in-loop, no-plusplus, no-promise-executor-return */
'use server';

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { models, getTracedModel } from '@/lib/ai/models';
import {
  BLOG_META_PROMPT,
  BLOG_CONTENT_PROMPT,
  BLOG_IMAGE_SEARCH_PROMPT,
  BLOG_IMAGE_GENERATION_PROMPT,
  BLOG_NEWS_META_PROMPT,
  BLOG_NEWS_CONTENT_PROMPT,
  BLOG_TRIBUNAL_META_PROMPT,
  BLOG_TRIBUNAL_CONTENT_PROMPT,
} from '@/lib/ai/prompts';
import { writeClient } from '@/lib/sanity/client';
import {
  fetchBlogPhoto,
  fetchBlogPhotosForEvaluation,
  downloadPhoto,
  formatPhotoCredit,
  type PexelsPhoto,
} from '@/lib/pexels/client';
import { findBestImage, type ImageEvaluation } from '@/lib/ai/image-evaluation';
import { BLOG_TOPICS, BLOG_TAGS } from '@/constants';
import { createServerLogger } from '@/lib/logger';
import { getCoveredTopics } from '@/lib/queries/blog';

const logger = createServerLogger({ action: 'blog' });

/**
 * Get the next author using least-recently-used rotation.
 * Queries all authors, checks last N posts for distribution,
 * and picks the author used least recently.
 */
async function getNextAuthor(): Promise<string | null> {
  const authors = await writeClient.fetch<{ _id: string }[]>(
    `*[_type == "author"] | order(_createdAt asc) { _id }`,
  );

  if (authors.length === 0) return null;
  if (authors.length === 1) return authors[0]._id;

  // Check last N posts (N = number of authors * 3) for recent author usage
  const lookback = authors.length * 3;
  const recentAuthorIds = await writeClient.fetch<string[]>(
    `*[_type == "post" && defined(author)] | order(publishedAt desc) [0...$limit].author->_id`,
    { limit: lookback },
  );

  // Find the author least recently used (or never used)
  const authorIds = authors.map((a) => a._id);
  const lastUsedIndex = new Map<string, number>();

  for (const id of authorIds) {
    const idx = recentAuthorIds.indexOf(id);
    lastUsedIndex.set(id, idx === -1 ? Infinity : idx);
  }

  // Pick the author with the highest index (least recently used) or Infinity (never used)
  // Higher index = further back in recency = least recently used
  const sorted = authorIds.sort(
    (a, b) => (lastUsedIndex.get(b) ?? 0) - (lastUsedIndex.get(a) ?? 0),
  );

  return sorted[0];
}

// Types
type BlogPostMeta = {
  title: string;
  slug: string;
  excerpt: string;
  keywords: string[];
  category: string;
};

type ImageSearchTerms = {
  searchTerms: string[];
  altText: string;
  style: string;
};

type FeaturedImage = {
  asset: { _type: 'reference'; _ref: string };
  alt: string;
  credit?: string;
  creditUrl?: string;
  pexelsPhotoId?: string;
};

type PexelsSearchResult = {
  photo: PexelsPhoto | null;
  searchTerm: string;
  allPhotos?: PexelsPhoto[];
};

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
 * Get all Pexels photo IDs currently in use across blog posts
 * Used for deduplication to avoid using the same photo twice
 */
async function getUsedPexelsIds(excludePostId?: string): Promise<string[]> {
  const query = excludePostId
    ? `*[_type == "post" && _id != $excludePostId && defined(generationMeta.pexelsPhotoId)].generationMeta.pexelsPhotoId`
    : `*[_type == "post" && defined(generationMeta.pexelsPhotoId)].generationMeta.pexelsPhotoId`;

  const ids = await writeClient.fetch<string[]>(query, { excludePostId });
  return ids;
}

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

  const { output: meta } = await generateText({
    model: getTracedModel(models.text, {
      properties: { feature: 'blog_meta_generation', topic },
    }),
    output: Output.object({ schema: BlogMetaSchema }),
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

  const { output: searchTerms } = await generateText({
    model: getTracedModel(models.textFast, {
      properties: { feature: 'blog_image_search', title },
    }),
    output: Output.object({ schema: ImageSearchSchema }),
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
 * Generate image with Gemini 3 Pro Image when Pexels doesn't have suitable options
 * Uses Google's Gemini 3 Pro Image model via Vercel AI SDK
 */
const generateImageWithGemini = async (
  title: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> => {
  const prompt = BLOG_IMAGE_GENERATION_PROMPT.replace('{{TITLE}}', title);

  try {
    logger.info('Generating image with Gemini 3 Pro Image', { title });

    // Use Gemini 3 Pro Image via Vercel AI SDK
    const result = await generateText({
      model: getTracedModel(models.geminiImage, {
        properties: { feature: 'blog_image_generation', title },
      }),
      prompt: `Generate a high-quality professional photograph for this blog post. Do not include any text in the image. ${prompt}`,
    });

    // Images come back in result.files for image generation models
    // GeneratedFile has: base64, uint8Array, and mediaType properties
    const imageFile = result.files?.find((f) =>
      f.mediaType?.startsWith('image/'),
    );

    if (imageFile) {
      logger.info('Gemini 3 Pro Image generated image successfully');
      // Use uint8Array to create buffer (more efficient than base64 decoding)
      const buffer = Buffer.from(imageFile.uint8Array);

      return {
        buffer,
        mimeType: imageFile.mediaType,
      };
    }

    logger.error('Gemini 3 Pro Image response did not contain image data');
    return null;
  } catch (error) {
    logger.error(
      'Gemini 3 Pro Image generation failed',
      { title },
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
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

/** Minimum confidence score for AI to approve a Pexels image */
const IMAGE_EVALUATION_THRESHOLD = 60;

/**
 * Get featured image from Pexels (with AI evaluation) or Gemini
 * Returns the image asset and metadata for Sanity
 *
 * Flow:
 * 1. Generate search terms based on blog content
 * 2. Fetch multiple candidate photos from Pexels (excluding already-used photos)
 * 3. Use AI vision model to evaluate each photo's relevance
 * 4. Select the best photo that meets the confidence threshold
 * 5. Fall back to Gemini image generation if no Pexels photo qualifies
 */
const getFeaturedImage = async (
  title: string,
  excerpt: string,
  category: string,
  slug: string,
  excludeIds: string[] = [],
): Promise<FeaturedImage | null> => {
  try {
    // 1. Generate search terms
    logger.info('Generating image search terms', { title });
    const searchTerms = await generateImageSearchTerms(
      title,
      excerpt,
      category,
    );

    // 2. Fetch multiple candidate photos from Pexels (excluding already-used)
    logger.info('Searching Pexels for candidate images', {
      searchTerms: searchTerms.searchTerms,
      excludingCount: excludeIds.length,
    });
    const pexelsResult = await fetchBlogPhotosForEvaluation(
      searchTerms.searchTerms,
      {
        orientation: 'landscape',
        size: 'large',
        excludeIds,
      },
    );

    let selectedPhoto: PexelsPhoto | null = null;
    let selectedSearchTerm = '';
    let evaluationResult: ImageEvaluation | null = null;

    if (pexelsResult.photos.length > 0) {
      // 3. Evaluate photos with AI vision model (Gemini 2.5 Pro)
      logger.info('Evaluating Pexels images with AI', {
        candidateCount: pexelsResult.photos.length,
      });

      const { selectedIndex, evaluations } = await findBestImage(
        pexelsResult.photos.map((p) => ({
          url: p.photo.src.large,
          searchTerm: p.searchTerm,
        })),
        { title, excerpt, category },
        IMAGE_EVALUATION_THRESHOLD,
      );

      if (selectedIndex !== null) {
        selectedPhoto = pexelsResult.photos[selectedIndex].photo;
        selectedSearchTerm = pexelsResult.photos[selectedIndex].searchTerm;
        evaluationResult = evaluations[selectedIndex];

        logger.info('AI selected Pexels image', {
          searchTerm: selectedSearchTerm,
          photographer: selectedPhoto.photographer,
          photoId: selectedPhoto.id,
          confidence: evaluationResult.confidence,
          reasoning: evaluationResult.reasoning,
        });
      } else {
        // Log why no photo was selected
        const bestEvaluation = evaluations.reduce(
          (best, curr) => (curr.confidence > best.confidence ? curr : best),
          evaluations[0],
        );
        logger.info('AI rejected all Pexels images', {
          bestConfidence: bestEvaluation?.confidence ?? 0,
          threshold: IMAGE_EVALUATION_THRESHOLD,
          bestReasoning: bestEvaluation?.reasoning,
          concerns: bestEvaluation?.concerns,
        });
      }
    }

    // 4. Use selected Pexels photo if available
    if (selectedPhoto) {
      const buffer = await downloadPhoto(selectedPhoto, 'large2x');
      const assetRef = await uploadImageToSanity(
        buffer,
        `${slug}-featured.jpg`,
      );
      const credit = formatPhotoCredit(selectedPhoto);

      return {
        asset: assetRef,
        alt: searchTerms.altText,
        credit: credit.credit,
        creditUrl: credit.creditUrl,
        pexelsPhotoId: String(selectedPhoto.id),
      };
    }

    // 5. Fallback to Gemini image generation
    logger.info(
      'No suitable Pexels image found, falling back to Gemini generation',
      {
        title,
      },
    );
    const geminiResult = await generateImageWithGemini(title);

    if (geminiResult) {
      const assetRef = await uploadImageToSanity(
        geminiResult.buffer,
        `${slug}-featured-generated.png`,
      );

      return {
        asset: assetRef,
        alt: searchTerms.altText,
        credit: 'Generated with AI',
      };
    }

    logger.warn('Gemini image generation returned no image', { title });
    return null;
  } catch (error) {
    logger.error(
      'Error getting featured image',
      { title },
      error instanceof Error ? error : new Error(String(error)),
    );
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
    model: getTracedModel(models.text, {
      properties: { feature: 'blog_content_generation', title: meta.title },
    }),
    system:
      'You are a professional content writer specializing in UK parking and traffic law.',
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
  let spanCounter = 0;
  let linkCounter = 0;

  /**
   * Parse inline markdown formatting (bold, italic, links) into Portable Text spans.
   * Returns { children, markDefs } for a block.
   */
  const parseInlineFormatting = (
    text: string,
  ): { children: any[]; markDefs: any[] } => {
    const children: any[] = [];
    const markDefs: any[] = [];
    // Regex to match: **bold**, *italic*, [link text](url)
    const inlineRegex = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match = inlineRegex.exec(text);

    while (match !== null) {
      // Add plain text before this match
      if (match.index > lastIndex) {
        const plain = text.slice(lastIndex, match.index);
        if (plain) {
          children.push({
            _type: 'span',
            _key: `span-${spanCounter++}`,
            text: plain,
            marks: [],
          });
        }
      }

      if (match[1] !== undefined) {
        // Bold: **text**
        children.push({
          _type: 'span',
          _key: `span-${spanCounter++}`,
          text: match[1],
          marks: ['strong'],
        });
      } else if (match[2] !== undefined) {
        // Italic: *text*
        children.push({
          _type: 'span',
          _key: `span-${spanCounter++}`,
          text: match[2],
          marks: ['em'],
        });
      } else if (match[3] !== undefined && match[4] !== undefined) {
        // Link: [text](url)
        const linkKey = `link-${linkCounter++}`;
        markDefs.push({ _type: 'link', _key: linkKey, href: match[4] });
        children.push({
          _type: 'span',
          _key: `span-${spanCounter++}`,
          text: match[3],
          marks: [linkKey],
        });
      }

      lastIndex = match.index + match[0].length;
      match = inlineRegex.exec(text);
    }

    // Add remaining plain text
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      if (remaining) {
        children.push({
          _type: 'span',
          _key: `span-${spanCounter++}`,
          text: remaining,
          marks: [],
        });
      }
    }

    // If no inline formatting found, return single plain span
    if (children.length === 0) {
      children.push({
        _type: 'span',
        _key: `span-${spanCounter++}`,
        text,
        marks: [],
      });
    }

    return { children, markDefs };
  };

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        const { children, markDefs } = parseInlineFormatting(text);
        blocks.push({
          _type: 'block',
          _key: `block-${blocks.length}`,
          style: 'normal',
          markDefs,
          children,
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

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      // Skip horizontal rules — they don't add value in blog content
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      flushList();
      const level = headerMatch[1].length;
      const { children, markDefs } = parseInlineFormatting(headerMatch[2]);
      blocks.push({
        _type: 'block',
        _key: `block-${blocks.length}`,
        style: `h${level}`,
        markDefs,
        children,
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
      const { children, markDefs } = parseInlineFormatting(bulletMatch[1]);
      listItems.push({
        _type: 'block',
        _key: `list-${blocks.length + listItems.length}`,
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs,
        children,
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
      const { children, markDefs } = parseInlineFormatting(numberMatch[1]);
      listItems.push({
        _type: 'block',
        _key: `list-${blocks.length + listItems.length}`,
        style: 'normal',
        listItem: 'number',
        level: 1,
        markDefs,
        children,
      });
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      const { children, markDefs } = parseInlineFormatting(line.slice(2));
      blocks.push({
        _type: 'block',
        _key: `block-${blocks.length}`,
        style: 'blockquote',
        markDefs,
        children,
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
  options?: {
    contentSource?: 'news' | 'tribunal' | 'general';
    sourceUrl?: string;
  },
): Promise<string> => {
  // Get next author using least-recently-used rotation
  const authorRef = await getNextAuthor();

  // If no author exists, skip author reference
  if (!authorRef) {
    logger.warn('No author found in Sanity, creating post without author');
  }

  // Get category references
  const categoryRefs: {
    _type: 'reference';
    _ref: string;
    _key: string;
  }[] = [];
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

    // Track image source and pexels photo ID in generationMeta
    const imageSource = featuredImage.pexelsPhotoId ? 'pexels' : 'gemini';
    doc.generationMeta = {
      ...doc.generationMeta,
      imageSource,
      imageUpdatedAt: new Date().toISOString(),
      ...(featuredImage.pexelsPhotoId && {
        pexelsPhotoId: featuredImage.pexelsPhotoId,
      }),
    };
  }

  // Track content source and source URL in generationMeta
  if (options?.contentSource || options?.sourceUrl) {
    doc.generationMeta = {
      ...doc.generationMeta,
      ...(options.contentSource && { contentSource: options.contentSource }),
      ...(options.sourceUrl && { sourceUrl: options.sourceUrl }),
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
    const usedPexelsIds = await getUsedPexelsIds();
    logger.info('Excluding already-used Pexels photos', {
      count: usedPexelsIds.length,
    });
    const featuredImage = await getFeaturedImage(
      meta.title,
      meta.excerpt,
      meta.category,
      meta.slug,
      usedPexelsIds,
    );

    // 6. Convert content to Portable Text
    const portableText = markdownToPortableText(content);

    // 7. Create post in Sanity
    logger.info('Creating post in Sanity', { title: meta.title });
    await createSanityPost(meta, portableText, featuredImage, publishDate);

    logger.info('Successfully generated blog post', {
      slug: meta.slug,
      title: meta.title,
    });

    return {
      slug: meta.slug,
      title: meta.title,
      success: true,
    };
  } catch (error) {
    logger.error(
      'Error generating blog post',
      {
        topic,
      },
      error instanceof Error ? error : new Error(String(error)),
    );

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
  photos: {
    id: number;
    url: string;
    photographer: string;
    photographerUrl: string;
    alt: string;
  }[];
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
      error:
        error instanceof Error ? error.message : 'Failed to preview images',
    };
  }
};

/**
 * Regenerate featured image for an existing post
 * Uses AI Judge + Gemini fallback flow
 */
export const regeneratePostImage = async (
  postId: string,
): Promise<{
  success: boolean;
  imageSource?: 'pexels' | 'gemini';
  error?: string;
}> => {
  try {
    // 1. Fetch post details
    const post = await writeClient.fetch(
      `*[_type == "post" && _id == $postId][0]{
        _id,
        title,
        excerpt,
        "slug": slug.current,
        "category": categories[0]->title
      }`,
      { postId },
    );

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    logger.info('Regenerating image for post', { postId, title: post.title });

    // 2. Get used Pexels IDs (excluding this post's current ID)
    const usedPexelsIds = await getUsedPexelsIds(postId);
    logger.info('Excluding already-used Pexels photos', {
      count: usedPexelsIds.length,
    });

    // 3. Get new featured image using AI Judge + Gemini fallback
    const featuredImage = await getFeaturedImage(
      post.title,
      post.excerpt || '',
      post.category || 'Parking',
      post.slug,
      usedPexelsIds,
    );

    if (!featuredImage) {
      return { success: false, error: 'Failed to generate image' };
    }

    // 4. Determine image source
    const imageSource = featuredImage.pexelsPhotoId ? 'pexels' : 'gemini';

    // 5. Update post with new image
    const patchData: Record<string, any> = {
      featuredImage: {
        _type: 'image',
        asset: featuredImage.asset,
        alt: featuredImage.alt,
        credit: featuredImage.credit,
        creditUrl: featuredImage.creditUrl,
      },
      'generationMeta.imageSource': imageSource,
      'generationMeta.imageUpdatedAt': new Date().toISOString(),
    };

    // Add pexelsPhotoId if available
    if (featuredImage.pexelsPhotoId) {
      patchData['generationMeta.pexelsPhotoId'] = featuredImage.pexelsPhotoId;
    }

    await writeClient.patch(postId).set(patchData).commit();

    logger.info('Successfully regenerated image', {
      postId,
      title: post.title,
      imageSource,
    });

    return { success: true, imageSource };
  } catch (error) {
    logger.error(
      'Failed to regenerate post image',
      { postId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Regenerate images for all posts (batch operation)
 * Returns progress updates via generator
 */
export const regenerateAllPostImages = async (): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: {
    postId: string;
    title: string;
    success: boolean;
    imageSource?: 'pexels' | 'gemini';
    error?: string;
  }[];
}> => {
  // Fetch all posts
  const posts = await writeClient.fetch<{ _id: string; title: string }[]>(
    `*[_type == "post"] | order(publishedAt desc) { _id, title }`,
  );

  logger.info('Starting batch image regeneration', {
    totalPosts: posts.length,
  });
  logger.info(`Found ${posts.length} posts to process`);

  const results: {
    postId: string;
    title: string;
    success: boolean;
    imageSource?: 'pexels' | 'gemini';
    error?: string;
  }[] = [];

  let successful = 0;
  let failed = 0;

  for (const post of posts) {
    const progress = `[${results.length + 1}/${posts.length}]`;
    logger.info(
      `Processing ${results.length + 1}/${posts.length}: ${post.title}`,
    );
    logger.info(`${progress} Processing: ${post.title}`);

    const result = await regeneratePostImage(post._id);

    results.push({
      postId: post._id,
      title: post.title,
      success: result.success,
      imageSource: result.imageSource,
      error: result.error,
    });

    if (result.success) {
      successful++;
      logger.info(`${progress} Success`, { imageSource: result.imageSource });
    } else {
      failed++;
      logger.info(`${progress} Failed`, { error: result.error });
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  logger.info('Batch image regeneration complete', {
    total: posts.length,
    successful,
    failed,
  });

  return {
    total: posts.length,
    successful,
    failed,
    results,
  };
};

// ============================================================================
// News & Tribunal Blog Post Generation
// ============================================================================

/**
 * Generate a blog post from a news video's data.
 * Reuses existing infrastructure (markdownToPortableText, createSanityPost, getFeaturedImage).
 */
export const generateNewsBlogPost = async (newsData: {
  headline: string;
  source: string;
  summary: string;
  category: string;
  articleUrl: string;
  coverImageUrl?: string | null;
}): Promise<{
  slug: string;
  title: string;
  success: boolean;
  error?: string;
}> => {
  try {
    logger.info('Generating news blog post', { headline: newsData.headline });

    // 1. Generate metadata
    const metaPrompt = BLOG_NEWS_META_PROMPT.replace(
      '{{HEADLINE}}',
      newsData.headline,
    )
      .replace('{{SOURCE}}', newsData.source)
      .replace('{{SUMMARY}}', newsData.summary)
      .replace('{{CATEGORY}}', newsData.category);

    const { output: meta } = await generateText({
      model: getTracedModel(models.text, {
        properties: { feature: 'blog_news_meta', headline: newsData.headline },
      }),
      output: Output.object({ schema: BlogMetaSchema }),
      prompt: metaPrompt,
      temperature: 0.7,
    });

    meta.slug = generateSlug(meta.title);
    logger.info('Generated news blog metadata', {
      title: meta.title,
      slug: meta.slug,
    });

    // 2. Check for duplicate slug
    const existingPost = await writeClient.fetch(
      `*[_type == "post" && slug.current == $slug][0]._id`,
      { slug: meta.slug },
    );
    if (existingPost) {
      throw new Error(`Post with slug "${meta.slug}" already exists`);
    }

    // 3. Generate content
    const coveredTopics = await getCoveredTopics();
    const contentPrompt = BLOG_NEWS_CONTENT_PROMPT.replace(
      '{{HEADLINE}}',
      newsData.headline,
    )
      .replace('{{SOURCE}}', newsData.source)
      .replace('{{SUMMARY}}', newsData.summary)
      .replace('{{CATEGORY}}', newsData.category)
      .replace('{{ARTICLE_URL}}', newsData.articleUrl)
      .replace('{{EXISTING_POSTS}}', coveredTopics.join(', '));

    const { text: content } = await generateText({
      model: getTracedModel(models.text, {
        properties: { feature: 'blog_news_content', title: meta.title },
      }),
      system:
        "You are a professional journalist specialising in UK motoring, parking law, and drivers' rights.",
      prompt: contentPrompt,
      temperature: 0.7,
    });

    if (!content) {
      throw new Error('Failed to generate news blog content');
    }

    // 4. Get featured image — try reusing the video cover, fall back to Pexels/Gemini
    let featuredImage: FeaturedImage | null = null;

    if (newsData.coverImageUrl) {
      try {
        const response = await fetch(newsData.coverImageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const assetRef = await uploadImageToSanity(
          buffer,
          `${meta.slug}-featured.jpg`,
        );
        featuredImage = {
          asset: assetRef,
          alt: meta.title,
        };
      } catch {
        logger.warn(
          'Failed to reuse video cover image, falling back to search',
          {
            coverImageUrl: newsData.coverImageUrl,
          },
        );
      }
    }

    if (!featuredImage) {
      const usedPexelsIds = await getUsedPexelsIds();
      featuredImage = await getFeaturedImage(
        meta.title,
        meta.excerpt,
        meta.category,
        meta.slug,
        usedPexelsIds,
      );
    }

    // 5. Convert to Portable Text and create post
    const portableText = markdownToPortableText(content);
    await createSanityPost(meta, portableText, featuredImage, undefined, {
      contentSource: 'news',
      sourceUrl: newsData.articleUrl,
    });

    logger.info('Successfully generated news blog post', {
      slug: meta.slug,
      title: meta.title,
    });

    return { slug: meta.slug, title: meta.title, success: true };
  } catch (error) {
    logger.error(
      'Error generating news blog post',
      { headline: newsData.headline },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      slug: '',
      title: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Generate a blog post from a tribunal case video's data.
 * Reuses existing infrastructure (markdownToPortableText, createSanityPost, getFeaturedImage).
 */
export const generateTribunalBlogPost = async (caseData: {
  authority: string;
  contravention: string;
  appealDecision: string;
  reasons: string;
  coverImageUrl?: string | null;
}): Promise<{
  slug: string;
  title: string;
  success: boolean;
  error?: string;
}> => {
  try {
    logger.info('Generating tribunal blog post', {
      authority: caseData.authority,
    });

    // 1. Generate metadata
    const metaPrompt = BLOG_TRIBUNAL_META_PROMPT.replace(
      '{{AUTHORITY}}',
      caseData.authority,
    )
      .replace('{{CONTRAVENTION}}', caseData.contravention)
      .replace('{{APPEAL_DECISION}}', caseData.appealDecision);

    const { output: meta } = await generateText({
      model: getTracedModel(models.text, {
        properties: {
          feature: 'blog_tribunal_meta',
          authority: caseData.authority,
        },
      }),
      output: Output.object({ schema: BlogMetaSchema }),
      prompt: metaPrompt,
      temperature: 0.7,
    });

    meta.slug = generateSlug(meta.title);
    logger.info('Generated tribunal blog metadata', {
      title: meta.title,
      slug: meta.slug,
    });

    // 2. Check for duplicate slug
    const existingPost = await writeClient.fetch(
      `*[_type == "post" && slug.current == $slug][0]._id`,
      { slug: meta.slug },
    );
    if (existingPost) {
      throw new Error(`Post with slug "${meta.slug}" already exists`);
    }

    // 3. Generate content
    const coveredTopics = await getCoveredTopics();
    const contentPrompt = BLOG_TRIBUNAL_CONTENT_PROMPT.replace(
      '{{AUTHORITY}}',
      caseData.authority,
    )
      .replace('{{CONTRAVENTION}}', caseData.contravention)
      .replace('{{APPEAL_DECISION}}', caseData.appealDecision)
      .replace('{{REASONS}}', caseData.reasons)
      .replace('{{EXISTING_POSTS}}', coveredTopics.join(', '));

    const { text: content } = await generateText({
      model: getTracedModel(models.text, {
        properties: { feature: 'blog_tribunal_content', title: meta.title },
      }),
      system:
        'You are a legal journalist specialising in UK parking tribunal cases. You translate complex legal reasoning into plain English.',
      prompt: contentPrompt,
      temperature: 0.7,
    });

    if (!content) {
      throw new Error('Failed to generate tribunal blog content');
    }

    // 4. Get featured image — try reusing the video cover, fall back to Pexels/Gemini
    let featuredImage: FeaturedImage | null = null;

    if (caseData.coverImageUrl) {
      try {
        const response = await fetch(caseData.coverImageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const assetRef = await uploadImageToSanity(
          buffer,
          `${meta.slug}-featured.jpg`,
        );
        featuredImage = {
          asset: assetRef,
          alt: meta.title,
        };
      } catch {
        logger.warn(
          'Failed to reuse video cover image, falling back to search',
          {
            coverImageUrl: caseData.coverImageUrl,
          },
        );
      }
    }

    if (!featuredImage) {
      const usedPexelsIds = await getUsedPexelsIds();
      featuredImage = await getFeaturedImage(
        meta.title,
        meta.excerpt,
        meta.category,
        meta.slug,
        usedPexelsIds,
      );
    }

    // 5. Convert to Portable Text and create post
    const portableText = markdownToPortableText(content);
    await createSanityPost(meta, portableText, featuredImage, undefined, {
      contentSource: 'tribunal',
    });

    logger.info('Successfully generated tribunal blog post', {
      slug: meta.slug,
      title: meta.title,
    });

    return { slug: meta.slug, title: meta.title, success: true };
  } catch (error) {
    logger.error(
      'Error generating tribunal blog post',
      { authority: caseData.authority },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      slug: '',
      title: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
