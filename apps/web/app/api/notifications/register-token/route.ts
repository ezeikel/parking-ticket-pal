/* eslint-disable import/prefer-default-export */

import { registerPushToken } from '@/app/actions/notification';
import { getUserId } from '@/utils/user';

export const POST = async (req: Request) => {
  const authenticatedUserId = await getUserId('register push token');

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
  const { token, platform, deviceId } = body;

  if (!token || !platform) {
    return Response.json(
      { success: false, error: 'Missing required fields: token, platform' },
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

  const result = await registerPushToken(authenticatedUserId, token, platform, deviceId);

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
    { success: true, pushToken: result.pushToken },
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
