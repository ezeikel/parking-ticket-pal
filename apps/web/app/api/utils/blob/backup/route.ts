import backupVercelBlobsToR2 from '@/scripts/backupVercelBlobsToR2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const maxDuration = 300;

export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: corsHeaders,
  });

export const GET = async () => {
  try {
    await backupVercelBlobsToR2();

    return Response.json(
      { success: true, message: 'Blob storage backup completed successfully' },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error('Blob backup failed:', error);

    return Response.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
};
