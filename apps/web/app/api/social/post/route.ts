import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { postToSocialMedia } from '@/app/actions/social';
import { getPostBySlug, getAllPosts } from '@/lib/queries/blog';
import { PostPlatform } from '@/types';

const LOG_PREFIX = '[social/post]';

export const maxDuration = 180;

const handleRequest = async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // eslint-disable-next-line no-console
      console.log(`${LOG_PREFIX} Unauthorized request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get parameters
    let slug: string;
    let platforms: PostPlatform[];

    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url);
      slug = searchParams.get('slug') || '';
      platforms = (searchParams.get('platforms')?.split(',') || [
        'instagram',
        'facebook',
      ]) as PostPlatform[];
    } else {
      const body = await request.json();
      slug = body.slug || '';
      platforms = body.platforms || ['instagram', 'facebook'];
    }

    // Get the blog post
    let post;
    if (!slug) {
      // If no slug provided, get the most recent blog post
      // eslint-disable-next-line no-console
      console.log(`${LOG_PREFIX} No slug provided, getting most recent blog post`);
      const allPosts = await getAllPosts();

      if (allPosts.length === 0) {
        return NextResponse.json(
          { error: 'No blog posts found' },
          { status: 404 },
        );
      }

      [post] = allPosts; // most recent post
      // eslint-disable-next-line no-console
      console.log(`${LOG_PREFIX} Using most recent post: ${post.meta.slug}`);
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

    // eslint-disable-next-line no-console
    console.log(`${LOG_PREFIX} Calling postToSocialMedia with slug: ${post.meta.slug}`);

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
    // eslint-disable-next-line no-console
    console.error(`${LOG_PREFIX} Error:`, error);

    // Only send actual errors to Sentry
    if (error instanceof Error) {
      Sentry.captureException(error);
    }

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
