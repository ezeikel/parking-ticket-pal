import syncBlobStorageReverse from '@/scripts/syncBlobStorageReverse';

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
    await syncBlobStorageReverse();

    return Response.json(
      { success: true, message: 'Blob storage sync completed successfully' },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error('Blob sync failed:', error);

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
