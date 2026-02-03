/**
 * R2 Storage Cleanup Script
 *
 * Cleans up old social media assets from R2 storage.
 * Can be run manually via GitHub Action or locally.
 *
 * Usage:
 *   npx tsx scripts/r2-cleanup.ts --prefix="social/images/" --keep-latest=1 --older-than-hours=24
 *   npx tsx scripts/r2-cleanup.ts --prefix="all-social-assets" --keep-latest=5 --dry-run
 */

import { list, del } from '@/lib/storage';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const prefix = getArg('prefix', 'social/');
const keepLatest = parseInt(getArg('keep-latest', '1'), 10);
const olderThanHours = parseInt(getArg('older-than-hours', '24'), 10);
const dryRun = hasFlag('dry-run');

// Social asset prefixes
const SOCIAL_PREFIXES = [
  'social/images/',
  'social/audio/',
  'social/videos/',
]; // Note: social/videos/ contains all video formats (reels, shorts, etc.)

async function cleanup() {
  console.log('='.repeat(60));
  console.log('R2 Storage Cleanup');
  console.log('='.repeat(60));
  console.log(`Prefix: ${prefix}`);
  console.log(`Keep latest: ${keepLatest}`);
  console.log(`Older than: ${olderThanHours} hours`);
  console.log(`Dry run: ${dryRun}`);
  console.log('='.repeat(60));

  const prefixesToClean = prefix === 'all-social-assets' ? SOCIAL_PREFIXES : [prefix];
  const cutoffTime = olderThanHours > 0 ? Date.now() - olderThanHours * 60 * 60 * 1000 : 0;

  let totalDeleted = 0;
  let totalKept = 0;
  let totalSkipped = 0;

  for (const currentPrefix of prefixesToClean) {
    console.log(`\nProcessing prefix: ${currentPrefix}`);
    console.log('-'.repeat(40));

    try {
      // List all files with this prefix
      let allBlobs: Array<{ pathname: string; url: string; size: number; uploadedAt: Date }> = [];
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await list({ prefix: currentPrefix, limit: 1000, cursor });
        allBlobs = allBlobs.concat(result.blobs);
        cursor = result.cursor;
        hasMore = result.hasMore;
      }

      if (allBlobs.length === 0) {
        console.log(`  No files found with prefix: ${currentPrefix}`);
        continue;
      }

      console.log(`  Found ${allBlobs.length} files`);

      // Sort by uploadedAt descending (newest first)
      allBlobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      // Keep the latest N items
      const toKeep = allBlobs.slice(0, keepLatest);
      const candidates = allBlobs.slice(keepLatest);

      console.log(`  Keeping ${toKeep.length} most recent files`);

      // Filter by age if specified
      const toDelete = cutoffTime > 0
        ? candidates.filter((blob) => blob.uploadedAt.getTime() < cutoffTime)
        : candidates;

      const skippedDueToAge = candidates.length - toDelete.length;
      if (skippedDueToAge > 0) {
        console.log(`  Skipping ${skippedDueToAge} files (not old enough)`);
      }

      totalKept += toKeep.length;
      totalSkipped += skippedDueToAge;

      if (toDelete.length === 0) {
        console.log(`  No files to delete`);
        continue;
      }

      console.log(`  ${dryRun ? 'Would delete' : 'Deleting'} ${toDelete.length} files:`);

      for (const blob of toDelete) {
        const age = Math.round((Date.now() - blob.uploadedAt.getTime()) / (1000 * 60 * 60));
        const sizeKB = Math.round(blob.size / 1024);
        console.log(`    ${dryRun ? '[DRY RUN] ' : ''}${blob.pathname} (${sizeKB}KB, ${age}h old)`);

        if (!dryRun) {
          try {
            await del(blob.url);
            totalDeleted++;
          } catch (error) {
            console.error(`    ERROR deleting ${blob.pathname}:`, error);
          }
        } else {
          totalDeleted++;
        }
      }
    } catch (error) {
      console.error(`  ERROR processing prefix ${currentPrefix}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Files kept: ${totalKept}`);
  console.log(`Files skipped (not old enough): ${totalSkipped}`);
  console.log(`Files ${dryRun ? 'would be ' : ''}deleted: ${totalDeleted}`);
  if (dryRun) {
    console.log('\nThis was a DRY RUN. No files were actually deleted.');
    console.log('Remove --dry-run flag to perform actual deletion.');
  }
}

// Run the cleanup
cleanup()
  .then(() => {
    console.log('\nCleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nCleanup failed:', error);
    process.exit(1);
  });
