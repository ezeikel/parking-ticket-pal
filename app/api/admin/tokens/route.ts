import { NextRequest, NextResponse } from 'next/server';
import { checkAllTokens } from '@/lib/meta-tokens';

export const maxDuration = 60;

export const GET = async (request: NextRequest) => {
  try {
    // Basic auth check (you might want to make this more secure)
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;

    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await checkAllTokens();

    // Check if any tokens are expiring soon
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const warnings = [];

    if (
      results.facebook.expiresAt &&
      results.facebook.expiresAt < thirtyDaysFromNow
    ) {
      warnings.push({
        platform: 'facebook',
        message: 'Token expires within 30 days',
        expiresAt: results.facebook.expiresAt,
      });
    }

    if (
      results.instagram.expiresAt &&
      results.instagram.expiresAt < thirtyDaysFromNow
    ) {
      warnings.push({
        platform: 'instagram',
        message: 'Token expires within 30 days',
        expiresAt: results.instagram.expiresAt,
      });
    }

    return NextResponse.json({
      status: 'success',
      tokens: {
        facebook: {
          isValid: results.facebook.isValid,
          expiresAt: results.facebook.expiresAt,
          error: results.facebook.error,
        },
        instagram: {
          isValid: results.instagram.isValid,
          expiresAt: results.instagram.expiresAt,
          error: results.instagram.error,
        },
      },
      warnings,
      environment: {
        facebookPageId: !!process.env.FACEBOOK_PAGE_ID,
        facebookAccessToken: !!process.env.FACEBOOK_ACCESS_TOKEN,
        instagramAccountId: !!process.env.INSTAGRAM_ACCOUNT_ID,
        note: 'Instagram uses the same FACEBOOK_ACCESS_TOKEN',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking tokens:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};
