#!/usr/bin/env -S npx tsx --env-file=.env.local

/**
 * Script to regenerate images for posts that are missing featured images
 * Run with: pnpm tsx --env-file=.env.local scripts/regenerate-missing-images.ts
 */

import { regeneratePostImage } from '../app/actions/blog';

const POSTS_MISSING_IMAGES = [
  { id: 'Qo04q7Fj4VfM1vO80S94jR', title: 'Navigating UK Rental Car Parking Fines Effectively' },
  { id: 'tOZJWBLgTaeICxCENbxz7N', title: 'Guide to Formal Representations for PCNs' },
  { id: 'tgl5Mmoqf6GWChfUqIMHul', title: 'Understanding Out of Time Statutory Declarations' },
  { id: 'Op3yiIBdetezywSxhTGOCO', title: 'Understanding UK Emergency Vehicle Exemptions' },
  { id: 'UTbl1VbQ9Zk8PrdnXiRhFR', title: 'PCN Code 18: Avoid Fines in Shared Use Bays' },
  { id: 'A50D5H00N612tX8qY5pCsX', title: 'Understanding PCN Code 45: Parking on Taxi Ranks' },
];

async function main() {
  console.log(`\n🖼️  Regenerating images for ${POSTS_MISSING_IMAGES.length} posts...\n`);

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < POSTS_MISSING_IMAGES.length; i++) {
    const post = POSTS_MISSING_IMAGES[i];
    const progress = `[${i + 1}/${POSTS_MISSING_IMAGES.length}]`;

    console.log(`${progress} Processing: ${post.title}`);

    try {
      const result = await regeneratePostImage(post.id);

      if (result.success) {
        successful++;
        console.log(`${progress} ✅ Success (${result.imageSource})\n`);
      } else {
        failed++;
        console.log(`${progress} ❌ Failed: ${result.error}\n`);
      }
    } catch (error) {
      failed++;
      console.log(`${progress} ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    // Delay between requests to avoid rate limits
    if (i < POSTS_MISSING_IMAGES.length - 1) {
      console.log('   Waiting 3s before next request...\n');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total: ${POSTS_MISSING_IMAGES.length}`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('');
}

main().catch(console.error);
