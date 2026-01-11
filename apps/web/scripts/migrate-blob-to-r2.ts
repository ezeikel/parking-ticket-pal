/**
 * Migration script: Vercel Blob to Cloudflare R2
 *
 * This script migrates files from Vercel Blob to Cloudflare R2
 * and updates database records with new URLs in the correct Neon branch.
 *
 * Usage:
 *   npx tsx scripts/migrate-blob-to-r2.ts [--dry-run] [--skip-db-update] [--env=production|preview|both]
 *
 * Options:
 *   --dry-run        List files that would be migrated without actually migrating
 *   --skip-db-update Skip database URL updates (useful for re-running migration)
 *   --env=production Migrate production blob → parking-ticket-pal-prod bucket → production Neon branch
 *   --env=preview    Migrate preview blob → parking-ticket-pal-dev bucket → development Neon branch
 *   --env=both       Migrate both environments (runs sequentially)
 *
 * Required Environment Variables:
 *   # Vercel Blob (source)
 *   BLOB_READ_WRITE_TOKEN         - Production blob token
 *   BLOB_READ_WRITE_TOKEN_PREVIEW - Preview/dev blob token
 *
 *   # Cloudflare R2 (destination)
 *   R2_ENDPOINT                   - R2 endpoint (same for both buckets)
 *   R2_ACCESS_KEY_ID              - R2 access key
 *   R2_SECRET_ACCESS_KEY          - R2 secret key
 *   R2_BUCKET_PROD                - Production bucket (parking-ticket-pal-prod)
 *   R2_BUCKET_DEV                 - Development bucket (parking-ticket-pal-dev)
 *   R2_PUBLIC_URL_PROD            - Production bucket public URL
 *   R2_PUBLIC_URL_DEV             - Development bucket public URL
 *
 *   # Neon Database (for URL updates)
 *   DATABASE_URL_PROD             - Production Neon branch connection string
 *   DATABASE_URL_DEV              - Development Neon branch connection string
 */

import { list as listBlobs } from '@vercel/blob';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import pLimit from 'p-limit';

// Parse --env flag
const getEnvFlag = (): 'production' | 'preview' | 'both' => {
  const envArg = process.argv.find((arg) => arg.startsWith('--env='));
  if (envArg) {
    const value = envArg.split('=')[1];
    if (value === 'preview' || value === 'production' || value === 'both') {
      return value;
    }
  }
  return 'both'; // default to both
};

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_DB_UPDATE = process.argv.includes('--skip-db-update');
const ENV_TO_MIGRATE = getEnvFlag();
const CONCURRENCY = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 30000;

// R2 client (same credentials for both buckets)
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Environment-specific configuration
type EnvConfig = {
  blobToken: string | undefined;
  r2Bucket: string;
  r2PublicUrl: string;
  databaseUrl: string;
  displayName: string;
};

const getEnvConfig = (env: 'production' | 'preview'): EnvConfig => {
  if (env === 'production') {
    return {
      blobToken: process.env.BLOB_READ_WRITE_TOKEN,
      r2Bucket: process.env.R2_BUCKET_PROD || 'parking-ticket-pal-prod',
      r2PublicUrl: process.env.R2_PUBLIC_URL_PROD!,
      databaseUrl: process.env.DATABASE_URL_PROD!,
      displayName: 'Production',
    };
  }
  return {
    blobToken: process.env.BLOB_READ_WRITE_TOKEN_PREVIEW,
    r2Bucket: process.env.R2_BUCKET_DEV || 'parking-ticket-pal-dev',
    r2PublicUrl: process.env.R2_PUBLIC_URL_DEV!,
    databaseUrl: process.env.DATABASE_URL_DEV || process.env.DATABASE_URL!,
    displayName: 'Preview/Development',
  };
};

// Helpers
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (
  url: string,
  retries = MAX_RETRIES,
): Promise<ArrayBuffer> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.arrayBuffer();
  } catch (error) {
    if (
      retries > 0 &&
      ((error instanceof Error && error.name === 'AbortError') ||
        error instanceof TypeError)
    ) {
      console.log(`  Retrying fetch... ${retries} attempts remaining`);
      await sleep(RETRY_DELAY_MS);
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};

const checkR2ObjectExists = async (
  bucket: string,
  key: string,
): Promise<boolean> => {
  try {
    await r2.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * Infer content type from file path
 */
const inferContentType = (pathname: string): string => {
  const ext = pathname.split('.').pop()?.toLowerCase();

  const contentTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    heic: 'image/heic',
    heif: 'image/heif',

    // Documents
    pdf: 'application/pdf',
    json: 'application/json',
    xml: 'application/xml',
    mdx: 'text/mdx',
    md: 'text/markdown',

    // Web
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    txt: 'text/plain',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
};

/**
 * Map old Vercel Blob path to new R2 flattened path
 */
const mapPathToNewStructure = (oldPath: string): string => {
  // Normalize path (remove leading slash if present)
  const path = oldPath.startsWith('/') ? oldPath.slice(1) : oldPath;

  // Blog posts and images - keep as is
  if (path.startsWith('blog/')) {
    return path;
  }

  // User signatures: users/{userId}/signature-*.svg -> users/{userId}/signature.svg
  const signatureMatch = path.match(/^users\/([^/]+)\/signature[^/]*\.svg$/);
  if (signatureMatch) {
    return `users/${signatureMatch[1]}/signature.svg`;
  }

  // User avatars: keep as is but ensure consistent naming
  const avatarMatch = path.match(
    /^users\/([^/]+)\/(avatar|profile)[^/]*\.(jpg|jpeg|png|webp)$/i,
  );
  if (avatarMatch) {
    return `users/${avatarMatch[1]}/avatar.${avatarMatch[3].toLowerCase()}`;
  }

  // Evidence files: users/{userId}/evidence/{ticketId}/{filename} -> tickets/{ticketId}/evidence/{filename}
  const evidenceMatch = path.match(/^users\/[^/]+\/evidence\/([^/]+)\/(.+)$/);
  if (evidenceMatch) {
    return `tickets/${evidenceMatch[1]}/evidence/${evidenceMatch[2]}`;
  }

  // Ticket images: users/{userId}/tickets/{ticketId}/{filename} -> tickets/{ticketId}/{filename}
  const ticketMatch = path.match(/^users\/[^/]+\/tickets\/([^/]+)\/(.+)$/);
  if (ticketMatch) {
    return `tickets/${ticketMatch[1]}/${ticketMatch[2]}`;
  }

  // Letter files: users/{userId}/letters/{letterId}/{filename} -> letters/{letterId}/{filename}
  const letterMatch = path.match(/^users\/[^/]+\/letters\/([^/]+)\/(.+)$/);
  if (letterMatch) {
    return `letters/${letterMatch[1]}/${letterMatch[2]}`;
  }

  // Form files: users/{userId}/forms/{formId}.pdf -> forms/{formId}.pdf
  const formMatch = path.match(/^users\/[^/]+\/forms\/([^/]+\.pdf)$/);
  if (formMatch) {
    return `forms/${formMatch[1]}`;
  }

  // Automation screenshots: keep structure but flatten
  if (path.startsWith('automation/')) {
    return path;
  }

  // Temp files: keep as is
  if (path.startsWith('temp/')) {
    return path;
  }

  // Default: keep original path
  console.warn(`  Warning: Unknown path structure, keeping as-is: ${path}`);
  return path;
};

interface MigrationResult {
  oldUrl: string;
  newUrl: string;
  newPath: string;
  skipped: boolean;
}

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
  urlMappings: Map<string, string>;
}

/**
 * Migrate blobs for a single environment
 */
const migrateEnvironment = async (
  env: 'production' | 'preview',
): Promise<MigrationStats> => {
  const config = getEnvConfig(env);
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    urlMappings: new Map(),
  };

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  Migrating ${config.displayName} Environment`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Blob Token: ${config.blobToken ? 'Set' : 'NOT SET'}`);
  console.log(`R2 Bucket: ${config.r2Bucket}`);
  console.log(`R2 Public URL: ${config.r2PublicUrl || 'NOT SET'}`);
  console.log(`Database URL: ${config.databaseUrl ? 'Set' : 'NOT SET'}`);

  if (!config.blobToken) {
    console.warn(`\nSkipping ${env} - no blob token configured`);
    return stats;
  }

  if (!config.r2PublicUrl) {
    console.error(`\nError: R2_PUBLIC_URL_${env === 'production' ? 'PROD' : 'DEV'} not set`);
    return stats;
  }

  // Temporarily set the token for the list operation
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
  process.env.BLOB_READ_WRITE_TOKEN = config.blobToken;

  try {
    console.log('\nFetching blobs from Vercel Blob...');
    const { blobs } = await listBlobs();
    stats.total = blobs.length;
    console.log(`Found ${blobs.length} blobs\n`);

    if (DRY_RUN) {
      console.log('--- DRY RUN: Showing path mappings ---\n');
      for (const blob of blobs) {
        const newPath = mapPathToNewStructure(blob.pathname);
        const newUrl = `${config.r2PublicUrl}/${newPath}`;
        console.log(`${blob.pathname}`);
        console.log(`  -> ${newPath}`);
        console.log(`  -> ${newUrl}\n`);
      }
      return stats;
    }

    console.log('--- Starting file migration ---\n');
    const limit = pLimit(CONCURRENCY);

    const migrations = blobs.map((blob) =>
      limit(async (): Promise<MigrationResult | null> => {
        const oldPath = blob.pathname;
        const newPath = mapPathToNewStructure(oldPath);
        const newUrl = `${config.r2PublicUrl}/${newPath}`;

        try {
          // Check if already exists in R2
          const exists = await checkR2ObjectExists(config.r2Bucket, newPath);
          if (exists) {
            console.log(`[SKIP] ${oldPath} (already exists)`);
            stats.skipped++;
            stats.urlMappings.set(blob.url, newUrl);
            return { oldUrl: blob.url, newUrl, newPath, skipped: true };
          }

          // Download from Vercel Blob
          console.log(`[DOWNLOAD] ${oldPath}`);
          const data = await fetchWithRetry(blob.url);

          // Upload to R2
          console.log(`[UPLOAD] ${newPath} -> ${config.r2Bucket}`);
          await r2.send(
            new PutObjectCommand({
              Bucket: config.r2Bucket,
              Key: newPath,
              Body: Buffer.from(data),
              ContentType: inferContentType(oldPath),
            }),
          );

          stats.migrated++;
          stats.urlMappings.set(blob.url, newUrl);
          console.log(`[OK] ${oldPath} -> ${newPath}`);
          return { oldUrl: blob.url, newUrl, newPath, skipped: false };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[FAIL] ${oldPath}: ${errorMsg}`);
          stats.failed++;
          stats.errors.push({ path: oldPath, error: errorMsg });
          return null;
        }
      }),
    );

    await Promise.all(migrations);

    // Update database URLs in the correct Neon branch
    if (!SKIP_DB_UPDATE && stats.urlMappings.size > 0) {
      await updateDatabaseUrls(config.databaseUrl, stats.urlMappings, config.displayName);
    }

    return stats;
  } finally {
    // Restore original token
    process.env.BLOB_READ_WRITE_TOKEN = originalToken;
  }
};

const updateDatabaseUrls = async (
  databaseUrl: string,
  urlMappings: Map<string, string>,
  envName: string,
): Promise<void> => {
  console.log(`\n--- Updating database URLs in ${envName} Neon branch ---\n`);

  // Create a Prisma client for this specific database
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  try {
    // Update User.signatureUrl
    const users = await prisma.user.findMany({
      where: { signatureUrl: { not: null } },
      select: { id: true, signatureUrl: true },
    });

    let userUpdates = 0;
    for (const user of users) {
      if (user.signatureUrl && urlMappings.has(user.signatureUrl)) {
        const newUrl = urlMappings.get(user.signatureUrl)!;
        await prisma.user.update({
          where: { id: user.id },
          data: { signatureUrl: newUrl },
        });
        userUpdates++;
      }
    }
    console.log(`Updated ${userUpdates} User.signatureUrl records`);

    // Update Media records (used for ticket images, letter images, evidence)
    const mediaRecords = await prisma.media.findMany({
      select: { id: true, url: true },
    });

    let mediaUpdates = 0;
    for (const media of mediaRecords) {
      if (media.url && urlMappings.has(media.url)) {
        const newUrl = urlMappings.get(media.url)!;
        await prisma.media.update({
          where: { id: media.id },
          data: { url: newUrl },
        });
        mediaUpdates++;
      }
    }
    console.log(`Updated ${mediaUpdates} Media.url records`);

    // Update Form records
    const forms = await prisma.form.findMany({
      select: { id: true, fileUrl: true },
    });

    let formUpdates = 0;
    for (const form of forms) {
      if (form.fileUrl && urlMappings.has(form.fileUrl)) {
        const newUrl = urlMappings.get(form.fileUrl)!;
        await prisma.form.update({
          where: { id: form.id },
          data: { fileUrl: newUrl },
        });
        formUpdates++;
      }
    }
    console.log(`Updated ${formUpdates} Form.fileUrl records`);

    console.log(`\nDatabase updates complete for ${envName}`);
  } finally {
    await prisma.$disconnect();
  }
};

const main = async (): Promise<void> => {
  console.log('========================================');
  console.log('  Vercel Blob to Cloudflare R2 Migration');
  console.log('========================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Environment(s): ${ENV_TO_MIGRATE}`);
  console.log(`Database updates: ${SKIP_DB_UPDATE ? 'DISABLED' : 'ENABLED'}`);
  console.log(`Concurrency: ${CONCURRENCY}`);

  const allStats: { env: string; stats: MigrationStats }[] = [];

  // Determine which environments to migrate
  const envsToMigrate: Array<'production' | 'preview'> =
    ENV_TO_MIGRATE === 'both' ? ['production', 'preview'] : [ENV_TO_MIGRATE];

  // Migrate each environment sequentially
  for (const env of envsToMigrate) {
    const stats = await migrateEnvironment(env);
    allStats.push({ env, stats });
  }

  // Print combined summary
  console.log('\n========================================');
  console.log('  Migration Summary');
  console.log('========================================');

  for (const { env, stats } of allStats) {
    const config = getEnvConfig(env as 'production' | 'preview');
    console.log(`\n${config.displayName}:`);
    console.log(`  Total blobs:    ${stats.total}`);
    console.log(`  Migrated:       ${stats.migrated}`);
    console.log(`  Skipped:        ${stats.skipped}`);
    console.log(`  Failed:         ${stats.failed}`);

    if (stats.errors.length > 0) {
      console.log('  Failed files:');
      for (const { path, error } of stats.errors) {
        console.log(`    - ${path}: ${error}`);
      }
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
