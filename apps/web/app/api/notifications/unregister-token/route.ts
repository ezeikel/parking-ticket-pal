/* eslint-disable import/prefer-default-export */

import { unregisterPushToken } from '@/app/actions/notification';
import { getUserId } from '@/utils/user';

export const POST = async (req: Request) => {
  const authenticatedUserId = await getUserId('unregister push token');

  if (!authenticatedUserId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 401,
      },
    );
  }

  const body = await req.json();
  const { token } = body;

  if (!token) {
    return Response.json(
      { success: false, error: 'Missing required field: token' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 400,
      },
    );
  }

  const result = await unregisterPushToken(authenticatedUserId, token);

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }

  return Response.json(
    { success: true },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};
