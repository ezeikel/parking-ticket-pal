import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { parseBody } from 'next-sanity/webhook';

type SanityWebhookPayload = {
  _type: string;
  _id: string;
  slug?: { current: string };
};

const SANITY_REVALIDATE_SECRET = process.env.SANITY_REVALIDATE_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    if (!SANITY_REVALIDATE_SECRET) {
      return NextResponse.json(
        { message: 'Missing SANITY_REVALIDATE_SECRET environment variable' },
        { status: 500 },
      );
    }

    // Parse and verify the webhook payload
    const { isValidSignature, body } = await parseBody<SanityWebhookPayload>(
      req,
      SANITY_REVALIDATE_SECRET,
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { message: 'Invalid signature' },
        { status: 401 },
      );
    }

    if (!body) {
      return NextResponse.json(
        { message: 'No body provided' },
        { status: 400 },
      );
    }

    const { _type, _id, slug } = body;
    const revalidatedTags: string[] = [];

    // Use { expire: 0 } for immediate cache expiration (required for webhooks)
    // This ensures content updates are visible immediately after Sanity changes
    const expireNow = { expire: 0 };

    // Revalidate based on document type
    switch (_type) {
      case 'post':
        // Revalidate blog-related tags
        revalidateTag('blog', expireNow);
        revalidateTag('blog-posts', expireNow);
        revalidateTag('blog-slugs', expireNow);
        revalidateTag('blog-topics', expireNow);
        revalidatedTags.push('blog', 'blog-posts', 'blog-slugs', 'blog-topics');

        // Revalidate the specific post if it has a slug
        if (slug?.current) {
          const postTag = `blog-post-${slug.current}`;
          revalidateTag(postTag, expireNow);
          revalidatedTags.push(postTag);
        }
        break;

      case 'author':
        // Authors appear on blog posts, revalidate all posts
        revalidateTag('blog', expireNow);
        revalidateTag('blog-posts', expireNow);
        revalidatedTags.push('blog', 'blog-posts');
        break;

      case 'category':
        // Categories appear on blog list and posts
        revalidateTag('blog', expireNow);
        revalidateTag('blog-posts', expireNow);
        revalidatedTags.push('blog', 'blog-posts');
        break;

      default:
        // Unknown type, no revalidation needed
        return NextResponse.json({
          message: `No revalidation configured for type: ${_type}`,
          revalidated: false,
        });
    }

    console.log(
      `[Sanity Webhook] Revalidated tags for ${_type} (${_id}):`,
      revalidatedTags,
    );

    return NextResponse.json({
      message: 'Revalidation successful',
      revalidated: true,
      tags: revalidatedTags,
      document: { _type, _id, slug: slug?.current },
    });
  } catch (error) {
    console.error('[Sanity Webhook] Error:', error);
    return NextResponse.json(
      { message: 'Error processing webhook', error: String(error) },
      { status: 500 },
    );
  }
}
