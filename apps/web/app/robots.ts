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
    ],
    sitemap: 'https://parkingticketpal.co.uk/sitemap.xml',
  };
}
