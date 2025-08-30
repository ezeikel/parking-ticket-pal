#!/usr/bin/env tsx

/* eslint-disable no-console */

/**
 * Test script for manual blog post generation with specific topics
 * Uses server action directly (no API route)
 * Usage: pnpm test-manual-blog [topic] [YYYY-MM-DD]
 */

import { generateBlogPostForTopic } from '@/app/actions/blog';

const testManualBlogGeneration = async () => {
  console.log('🎯 Testing Manual Blog Post Generation (server action)');
  console.log('=====================================================\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    console.log('Please add your OpenAI API key to .env.local');
    process.exit(1);
  }

  try {
    const argTopic = process.argv[2];
    const argDate = process.argv[3];

    const topic = argTopic ?? 'BPA vs IPC membership';

    let publishDate: Date | undefined;
    if (argDate) {
      const parsed = new Date(argDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }
      publishDate = parsed;
    }

    console.log(`🚀 Generating blog post for: ${topic}`);
    console.log(
      `   Publish Date: ${publishDate ? argDate : `Today (${new Date().toISOString().split('T')[0]})`}\n`,
    );

    const result = await generateBlogPostForTopic(topic, publishDate);

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    console.log('✅ Blog post generated successfully!');
    console.log(`   Title: ${result.title}`);
    console.log(`   Slug: ${result.slug}`);
    console.log(
      `   Publish Date: ${publishDate ? argDate : new Date().toISOString().split('T')[0]}`,
    );
    console.log(`   File: content/blog/${result.slug}.mdx`);

    console.log('\n🎉 Manual generation test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

// Run the test
testManualBlogGeneration();
