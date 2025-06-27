import { list } from '@vercel/blob';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';

const prodToken =
  process.env.PROD_BLOB_TOKEN! || process.env.BLOB_READ_WRITE_TOKEN!;
const R2_BUCKET = process.env.R2_BUCKET!;

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

type BlobItem = {
  pathname: string;
  url: string;
  contentType?: string;
};

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchWithRetry = async (
  url: string,
  retries = MAX_RETRIES,
): Promise<ArrayBuffer> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.arrayBuffer();
  } catch (error) {
    if (
      retries > 0 &&
      ((error instanceof Error && error.name === 'AbortError') ||
        error instanceof TypeError)
    ) {
      console.log(
        `Retrying fetch for ${url}. ${retries} attempts remaining...`,
      );
      await sleep(RETRY_DELAY_MS);
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};

const backupVercelBlobsToR2 = async () => {
  const prodBlobs = await list({ token: prodToken });

  console.log(`Backing up ${prodBlobs.blobs.length} blobs to R2...`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPrefix = timestamp;

  const limit = pLimit(10); // Limit to 10 concurrent uploads

  await Promise.all(
    prodBlobs.blobs.map((blob) =>
      limit(async () => {
        const key = `${backupPrefix}/${blob.pathname}`;
        console.log(`Uploading ${key} to R2...`);
        try {
          const data = await fetchWithRetry(blob.url);
          await r2.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: key,
              Body: Buffer.from(data),
              ContentType:
                (blob as BlobItem).contentType || 'application/octet-stream',
            }),
          );
        } catch (err) {
          console.error(`❌ Failed to upload ${key}:`, err);
        }
      }),
    ),
  );

  console.log('✅ Backup to R2 complete');
};

export default backupVercelBlobsToR2;
