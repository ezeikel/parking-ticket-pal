import type { MetadataRoute } from 'next';
import { parkingTemplates } from '@/data/templates/parking';
import { bailiffTemplates } from '@/data/templates/bailiff';
import { motoringTemplates } from '@/data/templates/motoring';
import { CONTRAVENTION_CODES } from '@parking-ticket-pal/constants';
import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANY_IDS,
  TRANSPORT_AUTHORITY_IDS,
} from '@/constants';
import { client } from '@/lib/sanity/client';
import { sitemapPostsQuery } from '@/lib/sanity/queries';

const BASE_URL = 'https://www.parkingticketpal.com';

async function getAllBlogPosts() {
  try {
    return await client.fetch<
      Array<{ slug: { current: string }; publishedAt: string; _updatedAt: string }>
    >(sitemapPostsQuery);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    // Main pages
    { url: `${BASE_URL}`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },

    // Tools index pages
    { url: `${BASE_URL}/tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/tools/vehicle`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/vehicle/mot-check`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/vehicle/reg-lookup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

    // Letter template index pages
    { url: `${BASE_URL}/tools/letters`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/letters/parking`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/letters/bailiff`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/letters/motoring`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

    // Reference index pages
    { url: `${BASE_URL}/tools/reference/contravention-codes`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tools/reference/issuers`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  // Dynamic letter template pages
  const parkingTemplatePages: MetadataRoute.Sitemap = parkingTemplates.map((template) => ({
    url: `${BASE_URL}/tools/letters/parking/${template.id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const bailiffTemplatePages: MetadataRoute.Sitemap = bailiffTemplates.map((template) => ({
    url: `${BASE_URL}/tools/letters/bailiff/${template.id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const motoringTemplatePages: MetadataRoute.Sitemap = motoringTemplates.map((template) => ({
    url: `${BASE_URL}/tools/letters/motoring/${template.id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Dynamic contravention code pages
  const contraventionCodePages: MetadataRoute.Sitemap = Object.values(CONTRAVENTION_CODES).map((code) => ({
    url: `${BASE_URL}/tools/reference/contravention-codes/${code.code}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Dynamic issuer pages
  const allIssuerIds = [
    ...LOCAL_AUTHORITY_IDS,
    ...PRIVATE_COMPANY_IDS,
    ...TRANSPORT_AUTHORITY_IDS,
  ];

  const issuerPages: MetadataRoute.Sitemap = allIssuerIds.map((issuerId) => ({
    url: `${BASE_URL}/tools/reference/issuers/${issuerId}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Dynamic blog post pages
  const blogPosts = await getAllBlogPosts();
  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug.current}`,
    lastModified: new Date(post._updatedAt || post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...parkingTemplatePages,
    ...bailiffTemplatePages,
    ...motoringTemplatePages,
    ...contraventionCodePages,
    ...issuerPages,
    ...blogPostPages,
  ];
}
