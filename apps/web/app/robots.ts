import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/tickets/',
          '/vehicles/',
          '/account/',
          '/new/',
          '/signin/',
          '/signup/',
          '/guest/',
          '/auth/',
          '/checkout/',
          '/subscribe/',
        ],
      },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
    ],
    sitemap: 'https://www.parkingticketpal.com/sitemap.xml',
    host: 'www.parkingticketpal.com',
  };
}
