#!/usr/bin/env tsx

import { checkAllTokens } from '@/lib/social-tokens';

const checkTokens = async () => {
  try {
    console.log('🔍 Checking social media API tokens...\n');

    const results = await checkAllTokens();

    console.log('📘 Facebook Token:');
    console.log(`  Valid: ${results.facebook.isValid ? '✅' : '❌'}`);
    if (results.facebook.expiresAt) {
      console.log(`  Expires: ${results.facebook.expiresAt.toISOString()}`);
      const daysUntilExpiry = Math.ceil(
        (results.facebook.expiresAt.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      console.log(`  Days until expiry: ${daysUntilExpiry}`);
    }
    if (results.facebook.error) {
      console.log(`  Error: ${results.facebook.error}`);
    }

    console.log('\n📱 Instagram Token:');
    console.log(`  Valid: ${results.instagram.isValid ? '✅' : '❌'}`);
    if (results.instagram.expiresAt) {
      console.log(`  Expires: ${results.instagram.expiresAt.toISOString()}`);
      const daysUntilExpiry = Math.ceil(
        (results.instagram.expiresAt.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      console.log(`  Days until expiry: ${daysUntilExpiry}`);
    }
    if (results.instagram.error) {
      console.log(`  Error: ${results.instagram.error}`);
    }

    console.log('\n💼 LinkedIn Token:');
    console.log(`  Valid: ${results.linkedin.isValid ? '✅' : '❌'}`);
    if (results.linkedin.expiresAt) {
      console.log(`  Expires: ${results.linkedin.expiresAt.toISOString()}`);
      const daysUntilExpiry = Math.ceil(
        (results.linkedin.expiresAt.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      console.log(`  Days until expiry: ${daysUntilExpiry}`);
      if (daysUntilExpiry <= 10) {
        console.log('  ⚠️  RENEWAL NEEDED SOON!');
      }
    }
    if (results.linkedin.error) {
      console.log(`  Error: ${results.linkedin.error}`);
    }

    console.log('\n📋 Environment Variables Status:');
    console.log(
      `  FACEBOOK_PAGE_ID: ${process.env.FACEBOOK_PAGE_ID ? '✅ Set' : '❌ Missing'}`,
    );
    console.log(
      `  FACEBOOK_ACCESS_TOKEN: ${process.env.FACEBOOK_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`,
    );
    console.log(
      `  INSTAGRAM_ACCOUNT_ID: ${process.env.INSTAGRAM_ACCOUNT_ID ? '✅ Set' : '❌ Missing'}`,
    );
    console.log(
      `  LINKEDIN_ACCESS_TOKEN: ${process.env.LINKEDIN_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`,
    );
    console.log(
      `  LINKEDIN_ORGANIZATION_ID: ${process.env.LINKEDIN_ORGANIZATION_ID ? '✅ Set' : '❌ Missing'}`,
    );
    console.log('  📝 Note: Instagram uses the same FACEBOOK_ACCESS_TOKEN');
    console.log('  ⚠️  Note: LinkedIn tokens expire every 2 months');

    // check if tokens are expiring soon
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    let hasWarnings = false;

    if (
      results.facebook.expiresAt &&
      results.facebook.expiresAt < thirtyDaysFromNow
    ) {
      console.log('\n⚠️  WARNING: Facebook token expires within 30 days!');
      hasWarnings = true;
    }

    if (
      results.instagram.expiresAt &&
      results.instagram.expiresAt < thirtyDaysFromNow
    ) {
      console.log('\n⚠️  WARNING: Instagram token expires within 30 days!');
      hasWarnings = true;
    }

    if (hasWarnings) {
      console.log('\n💡 Consider setting up token refresh automation.');
    }
  } catch (error) {
    console.error('❌ Error checking tokens:', error);
    process.exit(1);
  }
};

// run the check
checkTokens()
  .then(() => {
    console.log('\n✅ Token check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Token check failed:', error);
    process.exit(1);
  });
