import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/queries/blog';

// load Plus Jakarta Sans fonts from Google Fonts
const getPlusJakartaSansRegular = fetch(
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400&display=swap',
).then(async (res) => {
  const css = await res.text();
  const fontUrl = css.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, '');
  if (!fontUrl) throw new Error('Could not extract font URL');
  return fetch(fontUrl).then((fontRes) => fontRes.arrayBuffer());
});

const getPlusJakartaSansSemiBold = fetch(
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600&display=swap',
).then(async (res) => {
  const css = await res.text();
  const fontUrl = css.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, '');
  if (!fontUrl) throw new Error('Could not extract font URL');
  return fetch(fontUrl).then((fontRes) => fontRes.arrayBuffer());
});

const getPlusJakartaSansBold = fetch(
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&display=swap',
).then(async (res) => {
  const css = await res.text();
  const fontUrl = css.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, '');
  if (!fontUrl) throw new Error('Could not extract font URL');
  return fetch(fontUrl).then((fontRes) => fontRes.arrayBuffer());
});

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

  // load fonts
  const [jakartaRegular, jakartaSemiBold, jakartaBold] = await Promise.all([
    getPlusJakartaSansRegular,
    getPlusJakartaSansSemiBold,
    getPlusJakartaSansBold,
  ]);

  try {
    const post = await getPostBySlug(slug);

    if (!post) {
      // fallback for missing posts
      return new ImageResponse(
        <div
          style={{
            fontSize: 48,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          }}
        >
          Parking Ticket Pal
        </div>,
        {
          ...size,
          fonts: [
            {
              name: 'Plus Jakarta Sans',
              data: jakartaRegular,
              style: 'normal',
              weight: 400,
            },
            {
              name: 'Plus Jakarta Sans',
              data: jakartaSemiBold,
              style: 'normal',
              weight: 600,
            },
            {
              name: 'Plus Jakarta Sans',
              data: jakartaBold,
              style: 'normal',
              weight: 700,
            },
          ],
        },
      );
    }

    return new ImageResponse(
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Featured image - use explicit dimensions for Satori/ImageResponse compatibility */}
        {post.meta.image ? (
          <img
            src={post.meta.image}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: 'cover',
            }}
          />
        ) : null}

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
              : 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
          }}
        />

        {/* Content - constrained to square-safe zone for Instagram cropping (1200x630 -> 1080x1080) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            textAlign: 'center',
            color: 'white',
            maxWidth: '600px',
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

          {/* Title - sized to fit within square-safe zone */}
          <div
            style={{
              fontSize: post.meta.title.length > 50 ? 36 : 42,
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '20px',
              textAlign: 'center',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            {post.meta.title}
          </div>

          {/* Summary */}
          <div
            style={{
              fontSize: 22,
              lineHeight: 1.4,
              opacity: 0.9,
              textAlign: 'center',
              maxWidth: '550px',
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
      </div>,
      {
        ...size,
        fonts: [
          {
            name: 'Plus Jakarta Sans',
            data: jakartaRegular,
            style: 'normal',
            weight: 400,
          },
          {
            name: 'Plus Jakarta Sans',
            data: jakartaSemiBold,
            style: 'normal',
            weight: 600,
          },
          {
            name: 'Plus Jakarta Sans',
            data: jakartaBold,
            style: 'normal',
            weight: 700,
          },
        ],
      },
    );
  } catch (error) {
    console.error('Error generating OG image:', error);

    // fallback error image
    return new ImageResponse(
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        }}
      >
        Parking Ticket Pal
      </div>,
      {
        ...size,
        fonts: [
          {
            name: 'Plus Jakarta Sans',
            data: jakartaRegular,
            style: 'normal',
            weight: 400,
          },
        ],
      },
    );
  }
}
