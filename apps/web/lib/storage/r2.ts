/**
 * Cloudflare R2 Storage Utility
 *
 * Drop-in replacement for @vercel/blob using Cloudflare R2.
 * R2 is S3-compatible and offers:
 * - ~15x cheaper storage ($0.015/GB vs $0.23/GB)
 * - Free egress (vs $0.15/GB with Vercel)
 * - Same API patterns via AWS SDK
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

// Lazy initialization to avoid errors when env vars aren't set
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'R2 configuration missing. Required env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL',
      );
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error('R2_BUCKET environment variable is required');
  }
  return bucket;
}

function getPublicUrl(): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error(
      'R2_PUBLIC_URL environment variable is required (your R2 public bucket URL or custom domain)',
    );
  }
  // Remove trailing slash if present
  return publicUrl.replace(/\/$/, '');
}

export type PutOptions = {
  access?: 'public' | 'private';
  contentType?: string;
  allowOverwrite?: boolean;
};

export type PutResult = {
  url: string;
  pathname: string;
};

export type ListResult = {
  blobs: Array<{
    pathname: string;
    url: string;
    size: number;
    uploadedAt: Date;
  }>;
  cursor?: string;
  hasMore: boolean;
};

export type ListOptions = {
  prefix?: string;
  limit?: number;
  cursor?: string;
};

/**
 * Upload a file to R2 storage
 *
 * @param pathname - The path/key for the file (e.g., 'tickets/123/front.jpg')
 * @param body - The file content as Buffer, Uint8Array, or string
 * @param options - Upload options (contentType, access, allowOverwrite)
 * @returns Object containing the public URL and pathname
 *
 * @example
 * const { url } = await put('tickets/123/front.jpg', imageBuffer, {
 *   access: 'public',
 *   contentType: 'image/jpeg'
 * });
 */
export async function put(
  pathname: string,
  body: Buffer | Uint8Array | string,
  options: PutOptions = {},
): Promise<PutResult> {
  const client = getR2Client();
  const bucket = getBucket();
  const publicUrl = getPublicUrl();

  // Convert string to Buffer if needed
  const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body;

  // Infer content type if not provided
  const contentType = options.contentType || inferContentType(pathname);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: pathname,
      Body: bodyBuffer,
      ContentType: contentType,
    }),
  );

  const url = `${publicUrl}/${pathname}`;

  return {
    url,
    pathname,
  };
}

/**
 * Delete a file from R2 storage
 *
 * @param urlOrPathname - Either the full URL or just the pathname
 *
 * @example
 * await del('tickets/123/front.jpg');
 * await del('https://assets.parkingticketpal.com/tickets/123/front.jpg');
 */
export async function del(urlOrPathname: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucket();
  const publicUrl = getPublicUrl();

  // Extract pathname from URL if full URL is provided
  let pathname = urlOrPathname;
  if (urlOrPathname.startsWith('http')) {
    if (urlOrPathname.includes(publicUrl)) {
      pathname = urlOrPathname.replace(`${publicUrl}/`, '');
    } else {
      // Try to extract pathname from any URL
      const url = new URL(urlOrPathname);
      pathname = url.pathname.slice(1); // Remove leading slash
    }
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: pathname,
    }),
  );
}

/**
 * List files in R2 storage
 *
 * @param options - List options (prefix, limit, cursor for pagination)
 * @returns Object containing blobs array, cursor for pagination, and hasMore flag
 *
 * @example
 * const { blobs, hasMore, cursor } = await list({ prefix: 'tickets/' });
 */
export async function list(options: ListOptions = {}): Promise<ListResult> {
  const client = getR2Client();
  const bucket = getBucket();
  const publicUrl = getPublicUrl();

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: options.prefix,
      MaxKeys: options.limit || 1000,
      ContinuationToken: options.cursor,
    }),
  );

  const blobs = (response.Contents || []).map((item) => ({
    pathname: item.Key || '',
    url: `${publicUrl}/${item.Key}`,
    size: item.Size || 0,
    uploadedAt: item.LastModified || new Date(),
  }));

  return {
    blobs,
    cursor: response.NextContinuationToken,
    hasMore: response.IsTruncated || false,
  };
}

/**
 * Check if a file exists in R2 storage
 *
 * @param pathname - The path/key for the file
 * @returns True if file exists, false otherwise
 */
export async function exists(pathname: string): Promise<boolean> {
  const client = getR2Client();
  const bucket = getBucket();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: pathname,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a file from R2 storage as a Buffer
 *
 * @param pathname - The path/key for the file
 * @returns The file content as a Buffer, or null if not found
 */
export async function get(pathname: string): Promise<Buffer | null> {
  const client = getR2Client();
  const bucket = getBucket();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: pathname,
      }),
    );

    if (!response.Body) {
      return null;
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

/**
 * Infer content type from file extension
 */
function inferContentType(pathname: string): string {
  const ext = pathname.split('.').pop()?.toLowerCase();

  const contentTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    heic: 'image/heic',
    heif: 'image/heif',

    // Documents
    pdf: 'application/pdf',
    json: 'application/json',
    xml: 'application/xml',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mdx: 'text/mdx',
    md: 'text/markdown',

    // Web
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    txt: 'text/plain',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Check if a URL is an R2 URL
 */
export function isR2Url(url: string): boolean {
  try {
    const publicUrl = getPublicUrl();
    return url.startsWith(publicUrl);
  } catch {
    return false;
  }
}
