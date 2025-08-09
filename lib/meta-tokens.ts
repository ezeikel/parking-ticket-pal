import * as Sentry from '@sentry/nextjs';

type TokenInfo = {
  access_token: string;
  expires_in?: number;
  token_type: string;
};

type PageToken = {
  access_token: string;
  category: string;
  category_list: any[];
  name: string;
  id: string;
  tasks: string[];
};

/**
 * Check if a token is valid and get its info
 */
export const validateToken = async (
  accessToken: string,
): Promise<{
  isValid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}> => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`,
    );

    if (!response.ok) {
      return { isValid: false, error: 'Token validation failed' };
    }

    // Get token debug info
    const debugResponse = await fetch(
      `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`,
    );

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      const tokenData = debugData.data;

      return {
        isValid: tokenData.is_valid,
        expiresAt: tokenData.expires_at
          ? new Date(tokenData.expires_at * 1000)
          : undefined,
        scopes: tokenData.scopes,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if a token has the required permissions for social media posting
 */
export const checkTokenPermissions = async (
  accessToken: string,
): Promise<{
  isValid: boolean;
  hasRequiredPermissions: boolean;
  missingPermissions: string[];
  scopes?: string[];
  error?: string;
}> => {
  const requiredPermissions = [
    'pages_manage_posts', // Required for Facebook posting
    'pages_manage_engagement', // Required for Facebook photo uploads
    'instagram_basic', // Required for Instagram access
    'instagram_content_publish', // Required for Instagram posting
  ];

  try {
    const validation = await validateToken(accessToken);

    if (!validation.isValid) {
      return {
        isValid: false,
        hasRequiredPermissions: false,
        missingPermissions: requiredPermissions,
        error: validation.error,
      };
    }

    const scopes = validation.scopes || [];
    const missingPermissions = requiredPermissions.filter(
      (permission) => !scopes.includes(permission),
    );

    return {
      isValid: true,
      hasRequiredPermissions: missingPermissions.length === 0,
      missingPermissions,
      scopes,
    };
  } catch (error) {
    return {
      isValid: false,
      hasRequiredPermissions: false,
      missingPermissions: requiredPermissions,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Exchange short-lived token for long-lived token
 */
export const exchangeForLongLivedToken = async (
  shortLivedToken: string,
  appId: string,
  appSecret: string,
): Promise<{
  success: boolean;
  token?: string;
  expiresIn?: number;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${appId}&` +
        `client_secret=${appSecret}&` +
        `fb_exchange_token=${shortLivedToken}`,
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data: TokenInfo = await response.json();

    return {
      success: true,
      token: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get long-lived page access tokens
 */
export const getPageTokens = async (
  userAccessToken: string,
): Promise<{ success: boolean; tokens?: PageToken[]; error?: string }> => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`,
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();

    return {
      success: true,
      tokens: data.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get Instagram Business Account ID for a Facebook Page
 */
export const getInstagramAccountId = async (
  pageId: string,
  pageAccessToken: string,
): Promise<{
  success: boolean;
  instagramAccountId?: string;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`,
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();

    if (!data.instagram_business_account) {
      return {
        success: false,
        error: 'No Instagram Business Account linked to this Facebook Page',
      };
    }

    return {
      success: true,
      instagramAccountId: data.instagram_business_account.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check all social media tokens and log their status
 */
export const checkAllTokens = async (): Promise<{
  facebook: { isValid: boolean; expiresAt?: Date; error?: string };
  instagram: { isValid: boolean; expiresAt?: Date; error?: string };
}> => {
  const facebookToken = process.env.FACEBOOK_ACCESS_TOKEN;

  const results: {
    facebook: { isValid: boolean; expiresAt?: Date; error?: string };
    instagram: { isValid: boolean; expiresAt?: Date; error?: string };
  } = {
    facebook: { isValid: false, error: 'Token not configured' },
    instagram: { isValid: false, error: 'Token not configured' },
  };

  if (facebookToken) {
    const fbValidation = await validateToken(facebookToken);
    results.facebook = fbValidation;
    // Instagram uses the same Facebook token
    results.instagram = fbValidation;
  }

  // Log warnings for tokens expiring soon
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (
    results.facebook.expiresAt &&
    results.facebook.expiresAt < thirtyDaysFromNow
  ) {
    Sentry.captureMessage(
      `Facebook/Instagram token expires soon: ${results.facebook.expiresAt}`,
    );
  }

  return results;
};
