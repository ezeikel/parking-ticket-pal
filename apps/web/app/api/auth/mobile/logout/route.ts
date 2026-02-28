import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { verifyDeviceToken, createDeviceToken } from '@/lib/mobile-auth';
import { decrypt } from '@/app/lib/session';

const log = createServerLogger({ action: 'auth-mobile-logout' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const POST = async (req: Request) => {
  try {
    const { deviceId } = await req.json();

    if (!deviceId || typeof deviceId !== 'string') {
      return Response.json(
        { error: 'deviceId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Resolve userId from the authorization token
    const authHeader = req.headers.get('authorization');
    const tokenStr = authHeader?.split(' ')[1];
    let userId: string | undefined;

    if (tokenStr) {
      // Try device-format token first ({ deviceId, userId, type: 'device' })
      const devicePayload = await verifyDeviceToken(tokenStr);
      if (devicePayload?.userId) {
        userId = devicePayload.userId;
      } else {
        // Fall back to OAuth-format token ({ id, email })
        const sessionPayload = await decrypt(tokenStr);
        userId = (sessionPayload?.userId ?? sessionPayload?.id) as
          | string
          | undefined;
      }
    }

    if (!userId) {
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: corsHeaders },
      );
    }

    // Validate device session exists
    const deviceSession = await db.mobileDeviceSession.findUnique({
      where: { deviceId },
      include: { user: true },
    });

    if (!deviceSession) {
      return Response.json(
        { error: 'Device session not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Verify the token's user matches the device session
    if (deviceSession.userId !== userId) {
      return Response.json(
        { error: 'Token does not match device session' },
        { status: 403, headers: corsHeaders },
      );
    }

    // If user is already anonymous, just return a fresh token (idempotent)
    if (!deviceSession.user.email) {
      const token = await createDeviceToken(deviceId, deviceSession.userId);
      return Response.json(
        { token, userId: deviceSession.userId },
        { status: 200, headers: corsHeaders },
      );
    }

    // Create new anonymous user and point device session to it
    const anonymousUser = await db.user.create({
      data: {
        email: null,
        name: 'Mobile User',
      },
    });

    await db.mobileDeviceSession.update({
      where: { deviceId },
      data: { userId: anonymousUser.id },
    });

    const token = await createDeviceToken(deviceId, anonymousUser.id);

    log.info('User signed out, device switched to anonymous', {
      previousUserId: userId,
      newAnonymousUserId: anonymousUser.id,
      deviceId,
    });

    return Response.json(
      { token, userId: anonymousUser.id },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Logout error',
      undefined,
      error instanceof Error ? error : undefined,
    );

    return Response.json(
      { error: 'Logout failed' },
      { status: 500, headers: corsHeaders },
    );
  }
};
