import { NextRequest, NextResponse } from 'next/server';
import cleanupTempUploads from '@/scripts/cleanup-temp-uploads';

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

    console.log('Starting temporary file cleanup...');

    await cleanupTempUploads();

    console.log('Temporary file cleanup completed successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'Temporary file cleanup completed successfully',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Temporary file cleanup failed:', error);

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
