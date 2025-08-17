import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/app/actions/blog';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Parking Ticket Pal Blog Post';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Load fonts
  const interRegularFontData = await readFile(
    join(process.cwd(), 'public/fonts/Inter/Inter-Regular.ttf'),
  );
  const interSemiBoldFontData = await readFile(
    join(process.cwd(), 'public/fonts/Inter/Inter-SemiBold.ttf'),
  );
  const latoBoldFontData = await readFile(
    join(process.cwd(), 'public/fonts/Lato/Lato-Bold.ttf'),
  );

  try {
    const post = await getPostBySlug(slug);

    if (!post) {
      // fallback for missing posts
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 48,
              background: 'linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%)',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Parking Ticket Pal
          </div>
        ),
        {
          ...size,
          fonts: [
            {
              name: 'Inter',
              data: interRegularFontData,
              style: 'normal',
              weight: 400,
            },
          ],
        },
      );
    }

    return new ImageResponse(
      (
        <div
          style={{
            background: post.meta.image
              ? `url(${post.meta.image})`
              : 'linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            fontFamily: 'Inter, system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Background overlay - darker when using image for better text readability */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: post.meta.image
                ? 'rgba(0, 0, 0, 0.6)'
                : 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
            }}
          />

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              textAlign: 'center',
              color: 'white',
              maxWidth: '1000px',
            }}
          >
            {/* Brand */}
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                marginBottom: '20px',
                opacity: 0.9,
              }}
            >
              Parking Ticket Pal
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: post.meta.title.length > 60 ? 44 : 52,
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: '24px',
                textAlign: 'center',
                fontFamily: 'Lato, sans-serif',
              }}
            >
              {post.meta.title}
            </div>

            {/* Summary */}
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.4,
                opacity: 0.9,
                textAlign: 'center',
                maxWidth: '900px',
              }}
            >
              {post.meta.summary.length > 120
                ? `${post.meta.summary.substring(0, 120)}...`
                : post.meta.summary}
            </div>

            {/* Tags */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '32px',
                justifyContent: 'center',
              }}
            >
              {post.meta.tags.slice(0, 3).map((tag) => (
                <div
                  key={tag}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>

            {/* Author and date */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginTop: '32px',
                fontSize: 20,
                opacity: 0.8,
              }}
            >
              <div>{post.meta.author.name}</div>
              <div>•</div>
              <div>{post.readingTime}</div>
              <div>•</div>
              <div>
                {new Date(post.meta.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: 'Inter',
            data: interRegularFontData,
            style: 'normal',
            weight: 400,
          },
          {
            name: 'Inter',
            data: interSemiBoldFontData,
            style: 'normal',
            weight: 600,
          },
          {
            name: 'Lato',
            data: latoBoldFontData,
            style: 'normal',
            weight: 700,
          },
        ],
      },
    );
  } catch (error) {
    console.error('Error generating Twitter image:', error);

    // fallback error image
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Parking Ticket Pal
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: 'Inter',
            data: interRegularFontData,
            style: 'normal',
            weight: 400,
          },
        ],
      },
    );
  }
}
