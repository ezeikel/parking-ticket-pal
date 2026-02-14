/* eslint-disable import-x/no-extraneous-dependencies */
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { toPlainText } from '@portabletext/toolkit';
import { postToSocialMedia } from '@/app/actions/social';
import { getPostBySlug, getAllPosts } from '@/lib/queries/blog';
import { PostPlatform } from '@/types';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'social-post' });

export const maxDuration = 300; // 5 minutes - video rendering can take a while

const handleRequest = async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log.info('Unauthorized request');
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

    // Get the blog post slug
    let postSlug = slug;
    if (!postSlug) {
      // If no slug provided, get the most recent blog post
      log.info('No slug provided, getting most recent blog post');
      const allPosts = await getAllPosts();

      if (allPosts.length === 0) {
        return NextResponse.json(
          { error: 'No blog posts found' },
          { status: 404 },
        );
      }

      postSlug = allPosts[0].meta.slug; // most recent post slug
      log.info('Using most recent post', { postSlug });
    }

    // Get full blog post by slug (includes bodyBlocks for content)
    const post = await getPostBySlug(postSlug);
    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 },
      );
    }

    // Convert Portable Text body to plain text for Reel hook generation
    const blogContent = post.bodyBlocks ? toPlainText(post.bodyBlocks) : '';

    log.info('Calling postToSocialMedia', {
      slug: post.meta.slug,
      blogContentLength: blogContent.length,
    });

    // Call the server action
    const result = await postToSocialMedia({
      post,
      platforms,
      blogContent, // Required for Instagram Reel generation
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
    log.error('Error', undefined, error instanceof Error ? error : undefined);

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
