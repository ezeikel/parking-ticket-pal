import { list, put, del } from '@vercel/blob';

const devToken = process.env.DEV_BLOB_TOKEN!;
const prodToken = process.env.PROD_BLOB_TOKEN!;

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000; // 30 seconds
const RETRY_DELAY_MS = 1000; // 1 second

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
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

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

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

const syncBlobStorageReverse = async () => {
  // get all blobs from both environments
  const [prodBlobs, devBlobs] = await Promise.all([
    list({ token: prodToken }),
    list({ token: devToken }),
  ]);

  // delete all blobs in prod
  console.log('Deleting all blobs from prod...');
  await Promise.all(
    prodBlobs.blobs.map(async (blob) => {
      await del(blob.url, { token: prodToken });
    }),
  );

  // copy all dev blobs to prod
  console.log('Copying all blobs from dev to prod...');
  await Promise.all(
    devBlobs.blobs
      .filter((blob) => !blob.url.endsWith('/')) // Skip folders
      .map(async (blob) => {
        const prodKey = blob.pathname;
        console.log(`Uploading ${prodKey} to prod...`);

        try {
          const blobBuffer = await fetchWithRetry(blob.url);
          await put(prodKey, Buffer.from(blobBuffer), {
            token: prodToken,
            access: 'public',
            allowOverwrite: true,
          });
        } catch (error) {
          console.error(`Failed to sync blob ${prodKey}:`, error);
          throw error;
        }
      }),
  );

  console.log('✅ Reverse sync complete');
};

export default syncBlobStorageReverse;
