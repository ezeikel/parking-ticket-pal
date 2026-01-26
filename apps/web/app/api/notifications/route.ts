/* eslint-disable import/prefer-default-export */

import { getUserNotifications } from '@/app/actions/notification';
import { getUserId } from '@/utils/user';

export const GET = async (req: Request) => {
  const authenticatedUserId = await getUserId('get notifications');

  if (!authenticatedUserId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 401,
      },
    );
  }

  // Parse query params
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get('limit')
    ? parseInt(searchParams.get('limit')!, 10)
    : 50;
  const offset = searchParams.get('offset')
    ? parseInt(searchParams.get('offset')!, 10)
    : 0;
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  const result = await getUserNotifications(authenticatedUserId, {
    limit,
    offset,
    unreadOnly,
  });

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }

  return Response.json(
    {
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    },
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
};
