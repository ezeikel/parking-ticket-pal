import { getVehicles } from '@/app/actions/vehicle';

// longer duration to account for openai api calls
export const maxDuration = 30;

export async function GET() {
  const vehicles = await getVehicles();

  return Response.json(
    { vehicles },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
}
