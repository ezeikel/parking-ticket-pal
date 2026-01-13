/**
 * Script to regenerate all blog post images using AI Judge + Gemini fallback
 *
 * Run with: npx dotenv-cli -e .env.local -- npx tsx scripts/regenerate-images.ts
 */

import { regenerateAllPostImages } from '../app/actions/blog';

async function main() {
  console.log('Starting image regeneration for all blog posts...\n');

  const startTime = Date.now();
  const result = await regenerateAllPostImages();
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

  console.log('\n=== REGENERATION COMPLETE ===');
  console.log(`Total posts: ${result.total}`);
  console.log(`Successful: ${result.successful}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Duration: ${duration} minutes`);

  // Summary by image source
  const pexelsCount = result.results.filter((r) => r.imageSource === 'pexels').length;
  const geminiCount = result.results.filter((r) => r.imageSource === 'gemini').length;

  console.log(`\nImage sources:`);
  console.log(`  Pexels: ${pexelsCount}`);
  console.log(`  Gemini: ${geminiCount}`);

  // Log failures
  const failures = result.results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log('\nFailed posts:');
    failures.forEach((f) => {
      console.log(`  - ${f.title}: ${f.error}`);
    });
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
