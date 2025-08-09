import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { postToSocialMedia } from '@/app/actions/social';
import { getPostBySlug, getAllPosts } from '@/app/actions/blog';

export const maxDuration = 180;

const handleRequest = async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      Sentry.captureMessage('social/post: Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get parameters
    let slug: string;
    let platforms: ('instagram' | 'facebook')[];

    console.log('social/post: Request received');

    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url);
      slug = searchParams.get('slug') || '';
      platforms = (searchParams.get('platforms')?.split(',') || [
        'instagram',
        'facebook',
      ]) as ('instagram' | 'facebook')[];
    } else {
      const body = await request.json();
      slug = body.slug || '';
      platforms = body.platforms || ['instagram', 'facebook'];
    }

    // Get the blog post
    let post;
    if (!slug) {
      // If no slug provided, get the most recent blog post
      Sentry.captureMessage(
        'social/post: No slug provided, getting most recent blog post',
      );
      const allPosts = await getAllPosts();

      if (allPosts.length === 0) {
        return NextResponse.json(
          { error: 'No blog posts found' },
          { status: 404 },
        );
      }

      [post] = allPosts; // most recent post
      Sentry.captureMessage(
        `social/post: Using most recent post: ${post.meta.slug}`,
      );
    } else {
      // Get specific blog post by slug
      post = await getPostBySlug(slug);
      if (!post) {
        return NextResponse.json(
          { error: 'Blog post not found' },
          { status: 404 },
        );
      }
    }

    Sentry.captureMessage(
      `social/post: Calling postToSocialMedia with slug: ${post.meta.slug}`,
    );

    // Call the server action
    const result = await postToSocialMedia({
      post,
      platforms,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Social media posting failed',
          results: result.results,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    const statusCode = result.success ? 200 : 500;

    return NextResponse.json(
      {
        success: result.success,
        results: result.results,
        post: result.post,
        timestamp: new Date().toISOString(),
      },
      {
        status: statusCode,
      },
    );
  } catch (error) {
    console.error('Error in social media posting route:', error);
    Sentry.captureMessage(
      `social/post route: Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
