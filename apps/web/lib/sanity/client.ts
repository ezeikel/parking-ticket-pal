import { createClient, type QueryParams } from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01';

/**
 * Public client for reading published content
 * Safe to use in client components
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Enable CDN for faster reads
});

/**
 * Authenticated client for mutations (create, update, delete)
 * Only use on the server side
 */
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Disable CDN for writes
  token: process.env.SANITY_API_TOKEN,
});

/**
 * Fetch data with caching
 */
export async function sanityFetch<T>({
  query,
  params = {},
  revalidate = 60, // Cache for 60 seconds by default
  tags = [],
}: {
  query: string;
  params?: QueryParams;
  revalidate?: number | false;
  tags?: string[];
}): Promise<T> {
  return client.fetch<T>(query, params, {
    next: {
      revalidate: revalidate === false ? 31536000 : revalidate,
      tags,
    },
  });
}
