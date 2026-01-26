/* eslint-disable import/prefer-default-export */

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/app/actions/notification';
import { getUserId } from '@/utils/user';

export const GET = async () => {
  const authenticatedUserId = await getUserId('get notification preferences');

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

  const result = await getNotificationPreferences(authenticatedUserId);

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }

  return Response.json(
    { success: true, preferences: result.preferences },
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

export const PATCH = async (req: Request) => {
  const authenticatedUserId = await getUserId(
    'update notification preferences',
  );

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

  const result = await updateNotificationPreferences(
    authenticatedUserId,
    body.preferences,
  );

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }

  return Response.json(
    { success: true, preferences: result.preferences },
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
