import { getUserById, updateUserById } from '@/app/actions/user';
import { getUserId } from '@/utils/user';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  // Get authenticated user
  const authenticatedUserId = await getUserId('get user profile');

  if (!authenticatedUserId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 401,
      },
    );
  }

  // Use shared getUserById function (includes authorization check)
  const result = await getUserById(id, authenticatedUserId);

  if (!result.success) {
    const statusCode = result.error?.includes('Unauthorized') ? 403 : 404;
    return Response.json(
      { success: false, error: result.error },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: statusCode,
      },
    );
  }

  return Response.json(
    { user: result.user },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  // Get authenticated user
  const authenticatedUserId = await getUserId('update user profile');

  if (!authenticatedUserId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 401,
      },
    );
  }

  const body = await req.json();

  // Use shared updateUserById function (includes authorization check)
  const result = await updateUserById(id, authenticatedUserId, {
    name: body.name,
    phoneNumber: body.phoneNumber,
    addressLine1: body.addressLine1,
    addressLine2: body.addressLine2,
    city: body.city,
    county: body.county,
    postcode: body.postcode,
  });

  if (!result.success || !result.user) {
    const statusCode = result.error?.includes('Unauthorized') ? 403 : 500;
    return Response.json(
      { success: false, error: result.error },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: statusCode,
      },
    );
  }

  return Response.json(
    { success: true, user: result.user },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};
