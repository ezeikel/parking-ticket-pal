/* eslint-disable import/prefer-default-export */
import { NextRequest } from 'next/server';
import cleanupTempUploads from '@/scripts/cleanup-temp-uploads';

export const GET = async (request: NextRequest) => {
  // verify cron secret if needed
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await cleanupTempUploads();
    return new Response('Cleanup completed successfully', { status: 200 });
  } catch (error) {
    console.error('Cleanup cron job failed:', error);
    return new Response('Cleanup failed', { status: 500 });
  }
};
