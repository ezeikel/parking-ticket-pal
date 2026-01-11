#!/usr/bin/env tsx

import { postToSocialMedia } from '@/app/actions/social';
import { getAllPosts } from '@/lib/queries/blog';

const testSocialPosting = async () => {
  try {
    console.log('🧪 Testing Social Media Posting...\n');

    // Get a blog post to test with
    const posts = await getAllPosts();
    if (posts.length === 0) {
      console.error('❌ No blog posts found to test with');
      return;
    }

    const testPost = posts[0]; // Use most recent post
    console.log(`📝 Testing with post: "${testPost.meta.title}"`);
    console.log(`🔗 Slug: ${testPost.meta.slug}\n`);

    // Test social media posting
    console.log('🚀 Calling postToSocialMedia...');
    const result = await postToSocialMedia({
      post: testPost,
      // TODO: add linkedin once access is granted
      platforms: ['instagram', 'facebook'],
    });

    console.log('\n📊 Results:');
    console.log('Success:', result.success);
    console.log('Post:', result.post);

    if (result.results.instagram) {
      console.log('\n📱 Instagram:');
      console.log('  Success:', result.results.instagram.success);
      if (result.results.instagram.success) {
        console.log('  Media ID:', result.results.instagram.mediaId);
        console.log(
          '  Caption Preview:',
          `${result.results.instagram.caption?.substring(0, 100) ?? ''}...`,
        );
      } else {
        console.log('  Error:', result.results.instagram.error);
      }
    }

    if (result.results.facebook) {
      console.log('\n📘 Facebook:');
      console.log('  Success:', result.results.facebook.success);
      if (result.results.facebook.success) {
        console.log('  Post ID:', result.results.facebook.postId);
        console.log(
          '  Caption Preview:',
          `${result.results.facebook.caption?.substring(0, 100) ?? ''}...`,
        );
      } else {
        console.log('  Error:', result.results.facebook.error);
      }
    }

    if (result.error) {
      console.log('\n❌ Overall Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testSocialPosting()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
