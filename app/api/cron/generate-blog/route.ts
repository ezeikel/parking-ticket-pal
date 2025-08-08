 
import { type NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { generateRandomBlogPost, getCoveredTopics } from '@/app/actions/blog';

export const POST = async (request: NextRequest) => {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 },
      );
    }

    console.log('Starting automated blog post generation...');

    // Get current stats
    const coveredTopicsBefore = await getCoveredTopics();
    console.log('Posts already created:', coveredTopicsBefore.length);

    // Generate new blog post (cron jobs use current date)
    const result = await generateRandomBlogPost(new Date());

    if (!result.success) {
      console.error('Failed to generate blog post:', result.error);
      return NextResponse.json(
        {
          error: result.error,
          postsCreated: coveredTopicsBefore.length,
        },
        { status: 500 },
      );
    }

    // Revalidate blog pages to show new content
    revalidateTag('/blog');
    revalidateTag('/blog/[slug]');

    // Get updated stats
    const coveredTopicsAfter = await getCoveredTopics();

    console.log(`Successfully generated blog post: ${result.title}`);
    console.log('Posts now created:', coveredTopicsAfter.length);

    return NextResponse.json({
      success: true,
      message: 'Blog post generated successfully',
      post: {
        slug: result.slug,
        title: result.title,
      },
      stats: {
        before: coveredTopicsBefore.length,
        after: coveredTopicsAfter.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in blog generation cron job:', error);

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

// Also support GET for manual testing
export const GET = async (request: NextRequest) => {
  // Check for manual trigger parameter
  const { searchParams } = new URL(request.url);
  const trigger = searchParams.get('trigger');

  if (trigger === 'manual') {
    return POST(request);
  }

  // Otherwise return stats only
  try {
    const coveredTopics = await getCoveredTopics();

    return NextResponse.json({
      message: 'Blog generation cron endpoint',
      postsCreated: coveredTopics.length,
      endpoints: {
        generate: 'POST /api/cron/generate-blog',
        manualTrigger: 'GET /api/cron/generate-blog?trigger=manual',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
};
