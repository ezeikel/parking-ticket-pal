import { createServerLogger } from '@/lib/logger';
import { getOrCreateDeviceUser, createDeviceToken } from '@/lib/mobile-auth';

const log = createServerLogger({ action: 'auth-device-register' });

// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  try {
    const { deviceId } = await req.json();

    if (!deviceId || typeof deviceId !== 'string') {
      return Response.json({ error: 'deviceId is required' }, { status: 400 });
    }

    const { userId, isNew } = await getOrCreateDeviceUser(deviceId);
    const token = await createDeviceToken(deviceId, userId);

    return Response.json(
      { token, userId, isNew },
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
  } catch (error) {
    log.error(
      'Device registration error',
      undefined,
      error instanceof Error ? error : undefined,
    );

    return Response.json({ error: 'Registration failed' }, { status: 500 });
  }
};
