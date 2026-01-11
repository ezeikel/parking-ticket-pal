/**
 * Migration script: MDX Blog Posts to Sanity CMS
 *
 * This script migrates blog posts from:
 * 1. Local MDX files in content/blog/
 * 2. Vercel Blob storage (both production and preview)
 *
 * Usage:
 *   npx tsx scripts/migrate-blog-to-sanity.ts [--dry-run] [--skip-authors] [--skip-categories] [--env=production|preview|both]
 *
 * Options:
 *   --dry-run          List posts that would be migrated without actually migrating
 *   --skip-authors     Don't create authors (assume they exist)
 *   --skip-categories  Don't create categories (assume they exist)
 *   --env=production   Migrate from production blob store (default)
 *   --env=preview      Migrate from preview blob store
 *   --env=both         Migrate from both blob stores
 *
 * Required Environment Variables:
 *   BLOB_READ_WRITE_TOKEN         - Vercel Blob production token
 *   BLOB_READ_WRITE_TOKEN_PREVIEW - Vercel Blob preview token (optional)
 *   NEXT_PUBLIC_SANITY_PROJECT_ID - Sanity project ID
 *   NEXT_PUBLIC_SANITY_DATASET    - Sanity dataset name
 *   SANITY_API_TOKEN              - Sanity API write token
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { list as listBlobs } from '@vercel/blob';
import { createClient } from '@sanity/client';
import pLimit from 'p-limit';
import { AUTHORS, BLOG_TAGS } from '../constants/blog';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_AUTHORS = process.argv.includes('--skip-authors');
const SKIP_CATEGORIES = process.argv.includes('--skip-categories');
const CONCURRENCY = 5;

// Parse --env flag
const getEnvFlag = (): 'production' | 'preview' | 'both' => {
  const envArg = process.argv.find((arg) => arg.startsWith('--env='));
  if (envArg) {
    const value = envArg.split('=')[1];
    if (value === 'preview' || value === 'production' || value === 'both') {
      return value;
    }
  }
  return 'production';
};
const ENV_TO_MIGRATE = getEnvFlag();

// Sanity client
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// Types
interface MDXFrontmatter {
  title: string;
  date: string;
  author: {
    name: string;
    title: string;
    avatar?: string;
  };
  summary: string;
  image?: string;
  tags: string[];
  featured?: boolean;
  readingTime?: string;
}

interface MigrationStats {
  authors: { created: number; skipped: number };
  categories: { created: number; skipped: number };
  posts: { created: number; skipped: number; failed: number };
  errors: Array<{ slug: string; error: string }>;
}

/**
 * Generate a slug from text
 */
const generateSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

/**
 * Convert Markdown to Sanity Portable Text blocks
 * This is a simplified converter - for full support, use @sanity/block-tools
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
          children: parseInlineMarks(text),
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

  const parseInlineMarks = (text: string): any[] => {
    const children: any[] = [];
    let remaining = text;
    let keyIndex = 0;

    // Simple text parsing - handles **bold**, *italic*, `code`, [links](url)
    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        children.push({
          _type: 'span',
          _key: `span-${keyIndex++}`,
          text: boldMatch[1],
          marks: ['strong'],
        });
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text*
      const italicMatch = remaining.match(/^\*(.+?)\*/);
      if (italicMatch) {
        children.push({
          _type: 'span',
          _key: `span-${keyIndex++}`,
          text: italicMatch[1],
          marks: ['em'],
        });
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Code: `text`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        children.push({
          _type: 'span',
          _key: `span-${keyIndex++}`,
          text: codeMatch[1],
          marks: ['code'],
        });
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Find next special character
      const nextSpecial = remaining.search(/[\*`\[]/);
      if (nextSpecial === -1) {
        // No more special characters
        children.push({
          _type: 'span',
          _key: `span-${keyIndex++}`,
          text: remaining,
          marks: [],
        });
        break;
      } else if (nextSpecial > 0) {
        // Add text before special character
        children.push({
          _type: 'span',
          _key: `span-${keyIndex++}`,
          text: remaining.slice(0, nextSpecial),
          marks: [],
        });
        remaining = remaining.slice(nextSpecial);
      } else {
        // At special character but didn't match - add single char
        children.push({
          _type: 'span',
          _key: `span-${keyIndex++}`,
          text: remaining[0],
          marks: [],
        });
        remaining = remaining.slice(1);
      }
    }

    return children.length > 0
      ? children
      : [{ _type: 'span', _key: 'span-0', text: '', marks: [] }];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block start/end
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
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
        // Start code block
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

    // Empty line
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
        children: parseInlineMarks(headerMatch[2]),
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
        children: parseInlineMarks(bulletMatch[1]),
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
        children: parseInlineMarks(numberMatch[1]),
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
        children: parseInlineMarks(line.slice(2)),
      });
      continue;
    }

    // Regular paragraph line
    flushList();
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/**
 * Get blob token for a specific environment
 */
const getBlobToken = (env: 'production' | 'preview'): string | undefined => {
  if (env === 'preview') {
    return process.env.BLOB_READ_WRITE_TOKEN_PREVIEW;
  }
  return process.env.BLOB_READ_WRITE_TOKEN;
};

/**
 * List blog posts from Vercel Blob
 */
const listBlobPosts = async (
  env: 'production' | 'preview',
): Promise<Array<{ pathname: string; url: string; env: string }>> => {
  const token = getBlobToken(env);
  if (!token) {
    console.warn(`No token found for ${env} environment, skipping...`);
    return [];
  }

  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
  process.env.BLOB_READ_WRITE_TOKEN = token;

  try {
    const { blobs } = await listBlobs({ prefix: 'blog/' });
    return blobs
      .filter((blob) => blob.pathname.endsWith('.mdx'))
      .map((blob) => ({ pathname: blob.pathname, url: blob.url, env }));
  } finally {
    process.env.BLOB_READ_WRITE_TOKEN = originalToken;
  }
};

/**
 * List local MDX files
 */
const listLocalPosts = async (): Promise<
  Array<{ pathname: string; filePath: string }>
> => {
  const contentDir = path.join(process.cwd(), 'content', 'blog');

  try {
    const files = await fs.readdir(contentDir);
    return files
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => ({
        pathname: `blog/${file}`,
        filePath: path.join(contentDir, file),
      }));
  } catch {
    console.warn('No local content/blog directory found');
    return [];
  }
};

/**
 * Read MDX content from source (local file or blob URL)
 */
const readMDXContent = async (source: {
  filePath?: string;
  url?: string;
}): Promise<string> => {
  if (source.filePath) {
    return fs.readFile(source.filePath, 'utf-8');
  }
  if (source.url) {
    const response = await fetch(source.url);
    return response.text();
  }
  throw new Error('No source provided');
};

/**
 * Create authors in Sanity
 */
const createAuthors = async (
  stats: MigrationStats,
): Promise<Map<string, string>> => {
  const authorMap = new Map<string, string>();

  if (SKIP_AUTHORS) {
    console.log('Skipping author creation');
    return authorMap;
  }

  console.log('\n--- Creating Authors ---\n');

  for (const author of AUTHORS) {
    const slug = generateSlug(author.name);

    // Check if author exists
    const existing = await sanityClient.fetch(
      `*[_type == "author" && slug.current == $slug][0]._id`,
      { slug },
    );

    if (existing) {
      console.log(`[SKIP] Author: ${author.name} (exists)`);
      authorMap.set(author.name, existing);
      stats.authors.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create author: ${author.name}`);
      stats.authors.created++;
      continue;
    }

    const doc = {
      _type: 'author',
      name: author.name,
      slug: { _type: 'slug', current: slug },
      title: author.title,
    };

    const result = await sanityClient.create(doc);
    authorMap.set(author.name, result._id);
    console.log(`[CREATED] Author: ${author.name}`);
    stats.authors.created++;
  }

  return authorMap;
};

/**
 * Create categories in Sanity
 */
const createCategories = async (
  stats: MigrationStats,
): Promise<Map<string, string>> => {
  const categoryMap = new Map<string, string>();

  if (SKIP_CATEGORIES) {
    console.log('Skipping category creation');
    return categoryMap;
  }

  console.log('\n--- Creating Categories ---\n');

  // Get unique categories from BLOG_TAGS
  const uniqueCategories = [...new Set(BLOG_TAGS)];

  for (const tag of uniqueCategories) {
    const slug = generateSlug(tag);

    // Check if category exists
    const existing = await sanityClient.fetch(
      `*[_type == "category" && slug.current == $slug][0]._id`,
      { slug },
    );

    if (existing) {
      console.log(`[SKIP] Category: ${tag} (exists)`);
      categoryMap.set(tag, existing);
      stats.categories.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create category: ${tag}`);
      stats.categories.created++;
      continue;
    }

    const doc = {
      _type: 'category',
      title: tag,
      slug: { _type: 'slug', current: slug },
    };

    const result = await sanityClient.create(doc);
    categoryMap.set(tag, result._id);
    console.log(`[CREATED] Category: ${tag}`);
    stats.categories.created++;
  }

  return categoryMap;
};

/**
 * Upload image to Sanity and return asset reference
 */
const uploadImageToSanity = async (
  imageUrl: string,
): Promise<{ _type: 'image'; asset: { _type: 'reference'; _ref: string } } | null> => {
  try {
    // Skip if placeholder or local path
    if (imageUrl.startsWith('/') || imageUrl.includes('placeholder')) {
      return null;
    }

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const asset = await sanityClient.assets.upload('image', buffer, {
      filename: imageUrl.split('/').pop() || 'image.jpg',
    });

    return {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: asset._id,
      },
    };
  } catch (error) {
    console.error(`Failed to upload image: ${imageUrl}`, error);
    return null;
  }
};

/**
 * Migrate a single post
 */
const migratePost = async (
  source: { pathname: string; filePath?: string; url?: string; env?: string },
  authorMap: Map<string, string>,
  categoryMap: Map<string, string>,
  stats: MigrationStats,
): Promise<void> => {
  const slug = source.pathname
    .replace('blog/', '')
    .replace('.mdx', '');

  try {
    // Check if post exists
    const existing = await sanityClient.fetch(
      `*[_type == "post" && slug.current == $slug][0]._id`,
      { slug },
    );

    if (existing) {
      console.log(
        `[SKIP] Post: ${slug} (exists)${source.env ? ` [${source.env}]` : ''}`,
      );
      stats.posts.skipped++;
      return;
    }

    // Read content
    const content = await readMDXContent({
      filePath: source.filePath,
      url: source.url,
    });

    const parsed = matter(content);
    const frontmatter = parsed.data as MDXFrontmatter;
    const body = parsed.content;

    if (DRY_RUN) {
      console.log(
        `[DRY RUN] Would migrate: ${frontmatter.title}${source.env ? ` [${source.env}]` : ''}`,
      );
      stats.posts.created++;
      return;
    }

    // Get author reference
    let authorRef: string | undefined;
    if (frontmatter.author?.name) {
      authorRef = authorMap.get(frontmatter.author.name);
      if (!authorRef) {
        // Try to find existing author
        authorRef = await sanityClient.fetch(
          `*[_type == "author" && name == $name][0]._id`,
          { name: frontmatter.author.name },
        );
      }
    }

    // Get category references
    const categoryRefs: Array<{ _type: 'reference'; _ref: string; _key: string }> =
      [];
    if (frontmatter.tags) {
      for (const tag of frontmatter.tags) {
        let catId = categoryMap.get(tag);
        if (!catId) {
          // Try to find existing category
          catId = await sanityClient.fetch(
            `*[_type == "category" && title == $title][0]._id`,
            { title: tag },
          );
        }
        if (catId) {
          categoryRefs.push({
            _type: 'reference',
            _ref: catId,
            _key: `cat-${categoryRefs.length}`,
          });
        }
      }
    }

    // Upload featured image if exists
    let featuredImage = null;
    if (frontmatter.image) {
      featuredImage = await uploadImageToSanity(frontmatter.image);
    }

    // Convert markdown to portable text
    const portableText = markdownToPortableText(body);

    // Create post document
    const doc: any = {
      _type: 'post',
      title: frontmatter.title,
      slug: { _type: 'slug', current: slug },
      excerpt: frontmatter.summary,
      body: portableText,
      publishedAt: new Date(frontmatter.date).toISOString(),
      status: 'published',
    };

    if (authorRef) {
      doc.author = { _type: 'reference', _ref: authorRef };
    }

    if (categoryRefs.length > 0) {
      doc.categories = categoryRefs;
    }

    if (featuredImage) {
      doc.featuredImage = featuredImage;
    }

    await sanityClient.create(doc);
    console.log(
      `[CREATED] Post: ${frontmatter.title}${source.env ? ` [${source.env}]` : ''}`,
    );
    stats.posts.created++;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[FAIL] Post ${slug}: ${errorMsg}`);
    stats.posts.failed++;
    stats.errors.push({ slug, error: errorMsg });
  }
};

/**
 * Main migration function
 */
const main = async (): Promise<void> => {
  console.log('========================================');
  console.log('  MDX Blog to Sanity CMS Migration');
  console.log('========================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Environment(s): ${ENV_TO_MIGRATE}`);
  console.log(`Concurrency: ${CONCURRENCY}`);

  const stats: MigrationStats = {
    authors: { created: 0, skipped: 0 },
    categories: { created: 0, skipped: 0 },
    posts: { created: 0, skipped: 0, failed: 0 },
    errors: [],
  };

  // Create authors and categories first
  const authorMap = await createAuthors(stats);
  const categoryMap = await createCategories(stats);

  // Collect all posts
  console.log('\n--- Collecting Posts ---\n');

  const allPosts: Array<{
    pathname: string;
    filePath?: string;
    url?: string;
    env?: string;
  }> = [];

  // Local files
  const localPosts = await listLocalPosts();
  console.log(`Found ${localPosts.length} local MDX files`);
  allPosts.push(...localPosts);

  // Blob posts
  const envsToMigrate: Array<'production' | 'preview'> =
    ENV_TO_MIGRATE === 'both' ? ['production', 'preview'] : [ENV_TO_MIGRATE];

  for (const env of envsToMigrate) {
    const blobPosts = await listBlobPosts(env);
    console.log(`Found ${blobPosts.length} posts in ${env} blob store`);
    allPosts.push(...blobPosts);
  }

  console.log(`\nTotal posts to migrate: ${allPosts.length}\n`);

  // Migrate posts
  console.log('\n--- Migrating Posts ---\n');

  const limit = pLimit(CONCURRENCY);
  await Promise.all(
    allPosts.map((post) =>
      limit(() => migratePost(post, authorMap, categoryMap, stats)),
    ),
  );

  // Summary
  console.log('\n========================================');
  console.log('  Migration Summary');
  console.log('========================================');
  console.log('\nAuthors:');
  console.log(`  Created: ${stats.authors.created}`);
  console.log(`  Skipped: ${stats.authors.skipped}`);
  console.log('\nCategories:');
  console.log(`  Created: ${stats.categories.created}`);
  console.log(`  Skipped: ${stats.categories.skipped}`);
  console.log('\nPosts:');
  console.log(`  Created: ${stats.posts.created}`);
  console.log(`  Skipped: ${stats.posts.skipped}`);
  console.log(`  Failed:  ${stats.posts.failed}`);

  if (stats.errors.length > 0) {
    console.log('\nFailed posts:');
    for (const { slug, error } of stats.errors) {
      console.log(`  - ${slug}: ${error}`);
    }
  }

  console.log('\nMigration complete!');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
