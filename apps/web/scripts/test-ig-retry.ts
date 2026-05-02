// Local test of the new postReelToInstagram retry logic.
//
// Usage from apps/web:
//   npx tsx --env-file=.env.local scripts/test-ig-retry.ts <video_url> [cover_url]
//
// Posts a real Reel to the configured IG account on success. There is no
// dry-run for media_publish — only container creation can be observed.

import { postReelToInstagram } from '../lib/video-completion';

const [, , videoUrl, coverUrl] = process.argv;
if (!videoUrl) {
  console.error('Usage: tsx scripts/test-ig-retry.ts <video_url> [cover_url]');
  process.exit(1);
}

const caption = `Local retry test ${new Date().toISOString()}`;

console.log('postReelToInstagram inputs:');
console.log('  videoUrl:', videoUrl);
console.log('  coverUrl:', coverUrl || '(none)');
console.log('  caption :', caption);
console.log();

const tinyLogger = {
  info: (msg: string, ctx?: unknown) => console.log(`[info] ${msg}`, ctx ?? ''),
  warn: (msg: string, ctx?: unknown) => console.log(`[warn] ${msg}`, ctx ?? ''),
  error: (msg: string, ctx?: unknown, err?: Error) =>
    console.log(`[error] ${msg}`, ctx ?? '', err?.message ?? ''),
} as Parameters<typeof postReelToInstagram>[3];

async function main() {
  const start = Date.now();
  const result = await postReelToInstagram(
    videoUrl,
    caption,
    coverUrl || null,
    tinyLogger,
  );
  console.log();
  console.log(`done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log('result:', result);
}

main().catch((err) => {
  console.error('script crashed:', err);
  process.exit(1);
});
