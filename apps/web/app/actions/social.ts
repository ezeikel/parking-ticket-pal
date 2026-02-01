/* eslint-disable import/prefer-default-export */

'use server';

import sharp from 'sharp';
import { PostPlatform, type Post } from '@/types';
import openai from '@/lib/openai';
import { OPENAI_MODEL_GPT_4O } from '@/constants';
import { createServerLogger } from '@/lib/logger';
import { put, del } from '@/lib/storage';

const logger = createServerLogger({ action: 'social' });

/**
 * Generate Instagram image by calling the OG image endpoint
 */
const generateInstagramImage = async (post: Post): Promise<Buffer> => {
  try {
    // use the existing OG image endpoint to generate the image
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const ogImageUrl = `${baseUrl}/blog/${post.meta.slug}/opengraph-image`;

    // fetch the OG image
    const response = await fetch(ogImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OG image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // convert to Instagram format (1080x1080) using Sharp
    const instagramBuffer = await sharp(imageBuffer)
      .resize(1080, 1080, {
        fit: 'cover',
        position: 'center',
      })
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 100,
        progressive: true,
      })
      .toBuffer();

    return instagramBuffer;
  } catch (error) {
    logger.error(
      'Error generating Instagram image',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate LinkedIn image by using the existing OG image
 */
const generateLinkedInImage = async (post: Post): Promise<Buffer> => {
  try {
    // use the existing OG image endpoint to generate the image
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const ogImageUrl = `${baseUrl}/blog/${post.meta.slug}/opengraph-image`;

    // fetch the OG image
    const response = await fetch(ogImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OG image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // LinkedIn prefers 1200x627 (similar to Facebook but slightly different aspect)
    const linkedinBuffer = await sharp(imageBuffer)
      .resize(1200, 627, {
        fit: 'cover',
        position: 'center',
      })
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 95,
        progressive: true,
      })
      .toBuffer();

    return linkedinBuffer;
  } catch (error) {
    logger.error(
      'Error generating LinkedIn image',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate Facebook image by using the existing OG image
 */
const generateFacebookImage = async (post: Post): Promise<Buffer> => {
  try {
    // use the existing OG image endpoint to generate the image
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const ogImageUrl = `${baseUrl}/blog/${post.meta.slug}/opengraph-image`;

    // fetch the OG image
    const response = await fetch(ogImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OG image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // the OG image is already 1200x630 (perfect for Facebook), just convert to JPEG
    const facebookBuffer = await sharp(imageBuffer)
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 95,
        progressive: true,
      })
      .toBuffer();

    return facebookBuffer;
  } catch (error) {
    logger.error(
      'Error generating Facebook image',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Upload image to temporary storage and return public URL
 */
const uploadToTempStorage = async (
  imageBuffer: Buffer,
  platform: PostPlatform,
): Promise<string> => {
  const tempFileName = `temp/social/${platform}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;

  try {
    const { url } = await put(tempFileName, imageBuffer, {
      contentType: 'image/jpeg',
    });

    return url;
  } catch (error) {
    logger.error(
      'Error saving temporary image',
      {
        platform,
        tempFileName,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Clean up temporary image
 */
const cleanupTempImage = async (imageUrl: string): Promise<void> => {
  try {
    const { pathname } = new URL(imageUrl);
    await del(pathname);
  } catch (error) {
    logger.error(
      'Error cleaning up temporary image',
      {
        imageUrl,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
  }
};

/**
 * Generate Instagram caption
 */
const generateInstagramCaption = async (post: Post): Promise<string> => {
  const prompt = `You are a social media expert creating Instagram captions for a UK parking and traffic law website called "Parking Ticket Pal".

Create an engaging Instagram caption that:
- Starts with an attention-grabbing hook
- Briefly explains the key takeaway from the blog post
- Uses relevant emojis (but not too many)
- Includes relevant hashtags (5-8 hashtags max)
- Ends with "Link in bio for the full guide 📖"
- Keeps it concise (under 150 words)
- Uses UK terminology and context

The caption should be informative but accessible, helping people understand their parking rights and responsibilities.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Generate an Instagram caption for this blog post:
Title: ${post.meta.title}
Summary: ${post.meta.summary}
Tags: ${post.meta.tags.join(', ')}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating Instagram caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate LinkedIn caption
 */
const generateLinkedInCaption = async (
  post: Post,
  blogUrl: string,
): Promise<string> => {
  const prompt = `You are a social media expert creating LinkedIn posts for a UK parking and traffic law website called "Parking Ticket Pal".

Create a professional LinkedIn post that:
- Starts with a professional hook relevant to business owners/HR professionals
- Focuses on how this affects businesses and employees
- Provides 2-3 key professional insights
- Uses professional tone with light business emojis
- Includes relevant business hashtags
- Ends with a clear call-to-action to read the full article
- Is professional but engaging (150-200 words)
- Uses UK business terminology
- Focuses on compliance, employee rights, and business implications

The post should position you as a thought leader in UK parking/traffic law.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Generate a LinkedIn post for this blog article:
Title: ${post.meta.title}
Summary: ${post.meta.summary}
Tags: ${post.meta.tags.join(', ')}
Blog URL: ${blogUrl}

Include the blog URL at the end of the post.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating LinkedIn caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
        blogUrl,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate Facebook caption
 */
const generateFacebookCaption = async (
  post: Post,
  blogUrl: string,
): Promise<string> => {
  const prompt = `You are a social media expert creating Facebook posts for a UK parking and traffic law website called "Parking Ticket Pal".

Create an engaging Facebook post that:
- Starts with an attention-grabbing question or statement
- Provides a substantial preview of the blog content (2-3 key points)
- Uses a conversational, helpful tone
- Includes relevant emojis sparingly
- Ends with a clear call-to-action to read the full article
- Is longer than Instagram (200-300 words is fine)
- Uses UK terminology and context
- Focuses on helping people understand their rights
- Uses PLAIN TEXT ONLY - NO markdown formatting (no **bold**, no *italic*, no # headers)
- Use CAPS, line breaks, and emojis for emphasis instead of markdown

The post should provide real value while encouraging clicks to read more.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Generate a Facebook post for this blog article:
Title: ${post.meta.title}
Summary: ${post.meta.summary}
Tags: ${post.meta.tags.join(', ')}
Blog URL: ${blogUrl}

Include the blog URL at the end of the post.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating Facebook caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
        blogUrl,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

// Instagram API functions
const createInstagramMediaContainer = async (
  imageUrl: string,
  caption: string,
) => {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(
      `Failed to create Instagram media container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Check Instagram media container status
 * Returns status_code: 'FINISHED', 'IN_PROGRESS', or 'ERROR'
 */
const checkInstagramMediaStatus = async (
  creationId: string,
): Promise<{ status: string; error?: string }> => {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${creationId}?fields=status_code,status&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
  );
  const data = await response.json();
  return {
    status: data.status_code || 'UNKNOWN',
    error: data.status,
  };
};

/**
 * Wait for Instagram media container to be ready
 * Polls every 2 seconds for up to 30 seconds
 */
const waitForInstagramMediaReady = async (creationId: string): Promise<void> => {
  const maxAttempts = 15;
  const delayMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const { status, error } = await checkInstagramMediaStatus(creationId);

    if (status === 'FINISHED') {
      return;
    }

    if (status === 'ERROR') {
      throw new Error(`Instagram media processing failed: ${error}`);
    }

    logger.info('Waiting for Instagram media to be ready', {
      attempt: i + 1,
      maxAttempts,
      status,
    });

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Instagram media processing timed out');
};

const publishInstagramMedia = async (creationId: string) => {
  // Wait for media container to be ready before publishing
  await waitForInstagramMediaReady(creationId);

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(
      `Failed to publish Instagram media: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

// LinkedIn API functions
const postToLinkedInPage = async (message: string, imageUrl: string) => {
  // first, register the image with LinkedIn
  const registerImageResponse = await fetch(
    `https://api.linkedin.com/v2/assets?action=registerUpload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:organization:${process.env.LINKEDIN_ORGANIZATION_ID}`,
        },
      }),
    },
  );

  const registerData = await registerImageResponse.json();
  if (
    !registerData.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ]
  ) {
    throw new Error(
      `Failed to register LinkedIn image: ${JSON.stringify(registerData)}`,
    );
  }

  const { uploadUrl } =
    registerData.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ];
  const { asset } = registerData.value;

  // download and upload the image to LinkedIn
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();

  await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    },
    body: imageBuffer,
  });

  // create the post
  const postResponse = await fetch(`https://api.linkedin.com/v2/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: `urn:li:organization:${process.env.LINKEDIN_ORGANIZATION_ID}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: message,
          },
          shareMediaCategory: 'IMAGE',
          media: [
            {
              status: 'READY',
              media: asset,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const postData = await postResponse.json();
  if (!postData.id) {
    throw new Error(`Failed to post to LinkedIn: ${JSON.stringify(postData)}`);
  }
  return postData.id;
};

// Facebook API functions
const postToFacebookPage = async (message: string, imageUrl: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: imageUrl,
        message,
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(`Failed to post to Facebook: ${JSON.stringify(data)}`);
  }
  return data.id;
};

/**
 * Post blog content to social media platforms
 */
export const postToSocialMedia = async (params: {
  post: Post;
  platforms?: PostPlatform[];
}): Promise<{
  success: boolean;
  results: Record<
    string,
    {
      success: boolean;
      mediaId?: string;
      postId?: string;
      caption?: string;
      error?: string;
    }
  >;
  post: {
    slug: string;
    title: string;
  };
  error?: string;
}> => {
  let instagramImageUrl: string | null = null;
  let facebookImageUrl: string | null = null;
  let linkedinImageUrl: string | null = null;

  try {
    const { post, platforms = ['instagram', 'facebook', 'linkedin'] } = params;

    logger.info('Starting social media posting', {
      slug: post.meta.slug,
      title: post.meta.title,
      platforms,
    });

    const blogUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/blog/${post.meta.slug}`;
    const results: Record<
      string,
      {
        success: boolean;
        mediaId?: string;
        postId?: string;
        caption?: string;
        error?: string;
      }
    > = {};

    // Post to Instagram
    if (platforms.includes('instagram')) {
      try {
        if (
          !process.env.INSTAGRAM_ACCOUNT_ID ||
          !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
        ) {
          throw new Error('Instagram credentials not configured');
        }

        logger.info('Generating Instagram image', {
          slug: post.meta.slug,
        });
        const instagramImage = await generateInstagramImage(post);

        logger.info('Uploading Instagram image', {
          slug: post.meta.slug,
        });
        instagramImageUrl = await uploadToTempStorage(
          instagramImage,
          'instagram',
        );

        logger.info('Generating Instagram caption', {
          slug: post.meta.slug,
        });
        const instagramCaption = await generateInstagramCaption(post);

        logger.info('Creating Instagram media container', {
          slug: post.meta.slug,
        });
        const creationId = await createInstagramMediaContainer(
          instagramImageUrl,
          instagramCaption,
        );

        logger.info('Publishing Instagram media', {
          slug: post.meta.slug,
        });
        const mediaId = await publishInstagramMedia(creationId);

        results.instagram = {
          success: true,
          mediaId,
          caption: instagramCaption,
        };

        logger.info('Successfully posted to Instagram', {
          slug: post.meta.slug,
          mediaId,
        });
      } catch (error) {
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'Instagram posting failed',
          {
            slug: post.meta.slug,
            title: post.meta.title,
          },
          errorInstance,
        );
        results.instagram = {
          success: false,
          error: errorInstance.message,
        };
      }
    }

    // Post to Facebook
    if (platforms.includes('facebook')) {
      try {
        if (
          !process.env.FACEBOOK_PAGE_ID ||
          !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
        ) {
          throw new Error('Facebook credentials not configured');
        }

        logger.info('Generating Facebook image', {
          slug: post.meta.slug,
        });
        const facebookImage = await generateFacebookImage(post);

        logger.info('Uploading Facebook image', {
          slug: post.meta.slug,
        });
        facebookImageUrl = await uploadToTempStorage(facebookImage, 'facebook');

        logger.info('Generating Facebook caption', {
          slug: post.meta.slug,
        });
        const facebookCaption = await generateFacebookCaption(post, blogUrl);

        logger.info('Posting to Facebook', {
          slug: post.meta.slug,
        });
        const postId = await postToFacebookPage(
          facebookCaption,
          facebookImageUrl,
        );

        results.facebook = {
          success: true,
          postId,
          caption: facebookCaption,
        };

        logger.info('Successfully posted to Facebook', {
          slug: post.meta.slug,
          postId,
        });
      } catch (error) {
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'Facebook posting failed',
          {
            slug: post.meta.slug,
            title: post.meta.title,
          },
          errorInstance,
        );
        results.facebook = {
          success: false,
          error: errorInstance.message,
        };
      }
    }

    // Post to LinkedIn
    if (platforms.includes('linkedin')) {
      try {
        if (
          !process.env.LINKEDIN_ORGANIZATION_ID ||
          !process.env.LINKEDIN_ACCESS_TOKEN
        ) {
          throw new Error('LinkedIn credentials not configured');
        }

        logger.info('Generating LinkedIn image', {
          slug: post.meta.slug,
        });
        const linkedinImage = await generateLinkedInImage(post);

        logger.info('Uploading LinkedIn image', {
          slug: post.meta.slug,
        });
        linkedinImageUrl = await uploadToTempStorage(linkedinImage, 'linkedin');

        logger.info('Generating LinkedIn caption', {
          slug: post.meta.slug,
        });
        const linkedinCaption = await generateLinkedInCaption(post, blogUrl);

        logger.info('Posting to LinkedIn', {
          slug: post.meta.slug,
        });

        const postId = await postToLinkedInPage(
          linkedinCaption,
          linkedinImageUrl,
        );

        results.linkedin = {
          success: true,
          postId,
          caption: linkedinCaption,
        };

        logger.info('Successfully posted to LinkedIn', {
          slug: post.meta.slug,
          postId,
        });
      } catch (error) {
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'LinkedIn posting failed',
          {
            slug: post.meta.slug,
            title: post.meta.title,
          },
          errorInstance,
        );
        results.linkedin = {
          success: false,
          error: errorInstance.message,
        };
      }
    }

    const hasSuccess = Object.values(results).some((result) => result.success);

    return {
      success: hasSuccess,
      results,
      post: {
        slug: post.meta.slug,
        title: post.meta.title,
      },
    };
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error(
      'Error in social media posting',
      {
        slug: params.post?.meta?.slug || 'unknown',
        platforms: params.platforms,
      },
      errorInstance,
    );

    return {
      success: false,
      results: {},
      post: {
        slug: '',
        title: '',
      },
      error: errorInstance.message,
    };
  } finally {
    // Clean up temporary images
    if (instagramImageUrl) {
      try {
        await cleanupTempImage(instagramImageUrl);
      } catch (error) {
        logger.error(
          'Error cleaning up Instagram image',
          {
            instagramImageUrl,
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    if (facebookImageUrl) {
      try {
        await cleanupTempImage(facebookImageUrl);
      } catch (error) {
        logger.error(
          'Error cleaning up Facebook image',
          {
            facebookImageUrl,
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    if (linkedinImageUrl) {
      try {
        await cleanupTempImage(linkedinImageUrl);
      } catch (error) {
        logger.error(
          'Error cleaning up LinkedIn image',
          {
            linkedinImageUrl,
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }
};
