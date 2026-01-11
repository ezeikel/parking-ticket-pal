import { type NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import {
  generateBlogPostForTopic,
  generateRandomBlogPost,
} from '@/app/actions/blog';

// set max duration to 3 minutes
export const maxDuration = 180;

const handleRequest = async (request: NextRequest) => {
  try {
    // verify authentication
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 },
      );
    }

    // extract parameters based on request method
    let topic: string | undefined;
    let date: string | undefined;

    if (request.method === 'GET') {
      // for GET requests, extract from URL search params
      const { searchParams } = new URL(request.url);
      topic = searchParams.get('topic') || undefined;
      date = searchParams.get('date') || undefined;
    } else {
      // for POST requests, extract from request body
      const body = await request.json();
      topic = body.topic;
      date = body.date;
    }

    // validate topic if provided
    if (
      topic !== undefined &&
      (typeof topic !== 'string' || topic.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: 'topic must be a non-empty string if provided' },
        { status: 400 },
      );
    }

    // validate date if provided
    let publishDate: Date;
    if (date) {
      publishDate = new Date(date);
      if (Number.isNaN(publishDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD or ISO string' },
          { status: 400 },
        );
      }
    } else {
      publishDate = new Date(); // default to today
    }

    if (topic) {
      console.log(`Generating blog post for topic: ${topic}`);
    } else {
      console.log('Generating blog post for random topic');
    }
    console.log(`Publish date: ${publishDate.toISOString().split('T')[0]}`);

    // generate the blog post - use specific topic or random
    const result = topic
      ? await generateBlogPostForTopic(topic, publishDate)
      : await generateRandomBlogPost(publishDate);

    if (!result.success) {
      console.error('Failed to generate blog post:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // revalidate blog cache to show new content (expire: 0 for immediate invalidation)
    revalidateTag('blog', { expire: 0 });

    console.log(`Successfully generated blog post: ${result.title}`);

    return NextResponse.json({
      success: true,
      message: 'Blog post generated successfully',
      post: {
        slug: result.slug,
        title: result.title,
        publishDate: publishDate.toISOString().split('T')[0],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in manual blog generation:', error);

    return NextResponse.json(
      {
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
