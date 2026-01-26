#!/usr/bin/env tsx

import {
  exchangeForLongLivedToken,
  getPageTokens,
  getInstagramAccountId,
  validateToken,
  checkTokenPermissions,
} from '@/lib/social-tokens';

/**
 * Interactive script to help set up Meta API tokens correctly
 */
const setupMetaTokens = async () => {
  console.log('🚀 Social Media API Token Setup Guide\n');

  // Check if we already have tokens
  const existingToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (existingToken) {
    console.log('✅ Found existing FACEBOOK_PAGE_ACCESS_TOKEN');
    const permissionCheck = await checkTokenPermissions(existingToken);

    if (permissionCheck.isValid) {
      console.log('✅ Token is valid');

      if (permissionCheck.hasRequiredPermissions) {
        console.log('✅ Token has all required permissions');
        console.log('♾️  Token never expires (Page Access Token)');
        console.log("🎉 You're all set! No renewal needed.\n");
        return;
      }
      console.log('⚠️  Token is missing required permissions:');
      permissionCheck.missingPermissions.forEach((permission) => {
        console.log(`   ❌ ${permission}`);
      });
      console.log(
        '\n🔄 Need to regenerate token with Marketing API permissions...\n',
      );
    } else {
      console.log('❌ Token is invalid:', permissionCheck.error);
    }
  }

  console.log('📋 To set up Meta API tokens, follow these steps:\n');

  console.log('1️⃣  Get Short-lived User Access Token:');
  console.log('   • Go to: https://developers.facebook.com/tools/explorer/');
  console.log('   • Select your app');
  console.log('   • Add permissions:');
  console.log('     - pages_show_list');
  console.log('     - pages_read_engagement');
  console.log('     - pages_manage_posts (Marketing API)');
  console.log('     - pages_manage_engagement (Marketing API)');
  console.log('     - instagram_basic');
  console.log('     - instagram_content_publish');
  console.log('   • Generate Access Token');
  console.log('   • Copy the token\n');

  console.log('2️⃣  Set environment variables:');
  console.log('   FACEBOOK_BUSINESS_APP_ID=your_app_id');
  console.log('   FACEBOOK_BUSINESS_APP_SECRET=your_app_secret');
  console.log('   TEMP_USER_TOKEN=your_short_lived_user_token\n');

  console.log('3️⃣  Run this script again to exchange for long-lived tokens\n');

  // Check if we have the required env vars for token exchange
  const appId = process.env.FACEBOOK_BUSINESS_APP_ID;
  const appSecret = process.env.FACEBOOK_BUSINESS_APP_SECRET;
  const tempUserToken = process.env.TEMP_USER_TOKEN;

  if (!appId || !appSecret) {
    console.log(
      '⚠️  Missing FACEBOOK_BUSINESS_APP_ID or FACEBOOK_BUSINESS_APP_SECRET',
    );
    console.log('   Add these to your .env file and run again');
    return;
  }

  if (!tempUserToken) {
    console.log('⚠️  Missing TEMP_USER_TOKEN');
    console.log('   Add the short-lived user token from Graph API Explorer');
    return;
  }

  console.log('🔄 Exchanging short-lived token for long-lived token...');

  // Step 1: Exchange for long-lived user token
  const longLivedResult = await exchangeForLongLivedToken(
    tempUserToken,
    appId,
    appSecret,
  );

  if (!longLivedResult.success) {
    console.log('❌ Failed to exchange token:', longLivedResult.error);
    return;
  }

  console.log('✅ Got long-lived user token');

  // Step 2: Get page tokens
  const pageTokensResult = await getPageTokens(longLivedResult.token!);

  if (!pageTokensResult.success) {
    console.log('❌ Failed to get page tokens:', pageTokensResult.error);
    return;
  }

  console.log('\n📄 Your Facebook Pages:');
  pageTokensResult.tokens?.forEach((page, index) => {
    console.log(`   ${index + 1}. ${page.name} (ID: ${page.id})`);
  });

  if (!pageTokensResult.tokens || pageTokensResult.tokens.length === 0) {
    console.log(
      '❌ No Facebook pages found. Make sure you have admin access to at least one Facebook page.',
    );
    return;
  }

  // Use the first page (or you could make this interactive)
  const selectedPage = pageTokensResult.tokens[0];
  console.log(`\n🎯 Using page: ${selectedPage.name}`);

  // Step 3: Get Instagram account ID
  const instagramResult = await getInstagramAccountId(
    selectedPage.id,
    selectedPage.access_token,
  );

  console.log('\n📱 Instagram Business Account:');
  if (instagramResult.success) {
    console.log(
      `✅ Found Instagram account: ${instagramResult.instagramAccountId}`,
    );
  } else {
    console.log('⚠️  Instagram account not found:', instagramResult.error);
    console.log('   Make sure your Instagram account is:');
    console.log('   • A Business account (not personal)');
    console.log('   • Connected to your Facebook page');
  }

  // Step 4: Validate the page token
  const pageTokenValidation = await validateToken(selectedPage.access_token);

  console.log('\n🔍 Page Token Validation:');
  console.log(`✅ Valid: ${pageTokenValidation.isValid}`);
  if (pageTokenValidation.expiresAt) {
    console.log(`📅 Expires: ${pageTokenValidation.expiresAt.toISOString()}`);
  } else {
    console.log('♾️  Never expires (Perfect for automation!)');
  }

  // Step 5: Output the final environment variables
  console.log('\n🎉 Setup Complete! Add these to your .env file:\n');
  console.log('# Meta API Configuration');
  console.log(`FACEBOOK_PAGE_ID=${selectedPage.id}`);
  console.log(`FACEBOOK_PAGE_ACCESS_TOKEN=${selectedPage.access_token}`);

  if (instagramResult.success) {
    console.log(`INSTAGRAM_ACCOUNT_ID=${instagramResult.instagramAccountId}`);
  } else {
    console.log(
      '# INSTAGRAM_ACCOUNT_ID=your_instagram_account_id  # Set this up later',
    );
  }

  console.log('\n📝 Notes:');
  console.log('• Page Access Tokens never expire');
  console.log('• Same token works for both Facebook and Instagram');
  console.log('• No renewal automation needed');
  console.log('• Monitor with: pnpm check:tokens');

  console.log('\n🗑️  You can now remove these temporary variables:');
  console.log('• FACEBOOK_BUSINESS_APP_ID (only needed for setup)');
  console.log('• FACEBOOK_BUSINESS_APP_SECRET (only needed for setup)');
  console.log('• TEMP_USER_TOKEN (only needed for setup)');
};

// Run the setup
setupMetaTokens()
  .then(() => {
    console.log('\n✅ Token setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
