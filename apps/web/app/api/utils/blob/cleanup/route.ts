import { NextRequest, NextResponse } from 'next/server';
import cleanupTempUploads from '@/scripts/cleanup-temp-uploads';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'blob-cleanup' });

// Set max duration for cleanup operations
export const maxDuration = 300; // 5 minutes

export const GET = async (request: NextRequest) => {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('Starting temporary file cleanup');

    await cleanupTempUploads();

    log.info('Temporary file cleanup completed successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'Temporary file cleanup completed successfully',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    log.error(
      'Temporary file cleanup failed',
      undefined,
      error instanceof Error ? error : undefined,
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};
