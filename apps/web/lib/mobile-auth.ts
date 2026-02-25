// eslint-disable-next-line import-x/no-extraneous-dependencies
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import {
  attributeReferral,
  issueReferralCredits,
} from '@/lib/referral-attribution';

const logger = createServerLogger({ action: 'mobile-auth' });

const secretKey = process.env.NEXT_AUTH_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

/**
 * Create a device JWT token (365-day expiry)
 */
export async function createDeviceToken(
  deviceId: string,
  userId: string,
): Promise<string> {
  return new SignJWT({ deviceId, userId, type: 'device' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(encodedKey);
}

/**
 * Verify and decode a device JWT token
 */
export async function verifyDeviceToken(
  token: string,
): Promise<{ deviceId: string; userId: string; type: string } | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as { deviceId: string; userId: string; type: string };
  } catch (error) {
    logger.error(
      'Failed to verify device token',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

/**
 * Find existing device session or create anonymous user + device session.
 */
export async function getOrCreateDeviceUser(
  deviceId: string,
): Promise<{ userId: string; isNew: boolean }> {
  const existingSession = await db.mobileDeviceSession.findUnique({
    where: { deviceId },
  });

  if (existingSession) {
    // Update lastSeenAt
    await db.mobileDeviceSession.update({
      where: { deviceId },
      data: { lastSeenAt: new Date() },
    });

    return { userId: existingSession.userId, isNew: false };
  }

  // Create anonymous user + device session
  const user = await db.user.create({
    data: {
      email: null,
      name: 'Mobile User',
      mobileDeviceSessions: {
        create: { deviceId },
      },
    },
  });

  return { userId: user.id, isNew: true };
}

/**
 * Parse mobile auth from request headers.
 * Supports: `Bearer <JWT>` or `Device <deviceId>`
 */
export async function getMobileAuthFromHeaders(
  headers: Headers,
): Promise<{ userId: string; deviceId?: string } | null> {
  const authHeader = headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, value] = authHeader.split(' ', 2);

  if (scheme === 'Bearer' && value) {
    const payload = await verifyDeviceToken(value);
    if (payload?.userId) {
      return { userId: payload.userId, deviceId: payload.deviceId };
    }
    return null;
  }

  if (scheme === 'Device' && value) {
    const session = await db.mobileDeviceSession.findUnique({
      where: { deviceId: value },
    });
    if (session) {
      return { userId: session.userId, deviceId: value };
    }
    return null;
  }

  return null;
}

/**
 * Merge all data from anonymous user into target user, then delete anonymous user.
 *
 * Sequential DB operations are intentional here — order matters for data integrity
 * (e.g. tickets must be moved before vehicles are deleted).
 */
/* eslint-disable no-restricted-syntax, no-await-in-loop */
export async function mergeAnonymousUserIntoTarget(
  anonymousUserId: string,
  targetUserId: string,
): Promise<void> {
  logger.info('Merging anonymous user into target', {
    anonymousUserId,
    targetUserId,
  });

  // Get target user's existing vehicles for dedup
  const targetVehicles = await db.vehicle.findMany({
    where: { userId: targetUserId },
  });
  const targetRegNumbers = new Set(
    targetVehicles.map((v) => v.registrationNumber),
  );

  // Get anonymous user's vehicles
  const anonymousVehicles = await db.vehicle.findMany({
    where: { userId: anonymousUserId },
    include: { tickets: true },
  });

  for (const vehicle of anonymousVehicles) {
    if (targetRegNumbers.has(vehicle.registrationNumber)) {
      // Vehicle exists on target — move tickets to target's vehicle
      const targetVehicle = targetVehicles.find(
        (v) => v.registrationNumber === vehicle.registrationNumber,
      )!;

      for (const ticket of vehicle.tickets) {
        try {
          await db.ticket.update({
            where: { id: ticket.id },
            data: { vehicleId: targetVehicle.id },
          });
        } catch {
          // Handle pcnNumber unique constraint — skip duplicate tickets
          logger.warn('Skipping duplicate ticket during merge', {
            pcnNumber: ticket.pcnNumber,
            anonymousUserId,
            targetUserId,
          });
        }
      }

      // Delete the now-empty anonymous vehicle
      await db.vehicle.delete({ where: { id: vehicle.id } });
    } else {
      // Reassign vehicle to target user
      await db.vehicle.update({
        where: { id: vehicle.id },
        data: { userId: targetUserId },
      });
    }
  }
  /* eslint-enable no-restricted-syntax, no-await-in-loop */

  // Transfer push tokens
  await db.pushToken.updateMany({
    where: { userId: anonymousUserId },
    data: { userId: targetUserId },
  });

  // Transfer notifications
  await db.notification.updateMany({
    where: { userId: anonymousUserId },
    data: { userId: targetUserId },
  });

  // Point device sessions to target user
  await db.mobileDeviceSession.updateMany({
    where: { userId: anonymousUserId },
    data: { userId: targetUserId },
  });

  // Delete anonymous user (cascade deletes empty relations)
  await db.user.delete({ where: { id: anonymousUserId } });

  logger.info('Merge complete', { anonymousUserId, targetUserId });
}

/**
 * Handle OAuth sign-in from mobile, with device merge logic.
 *
 * 5 scenarios:
 * 1. No device session + email doesn't exist → create user with email, create device session
 * 2. No device session + email exists → link device to existing user
 * 3. Device session (anonymous) + email doesn't exist → update anonymous user with email
 * 4. Device session (anonymous) + email exists → merge anonymous into existing user
 * 5. Device session (authenticated) + different email → switch device to new user
 */
export async function handleMobileOAuthSignIn(
  deviceId: string | null | undefined,
  email: string,
  name?: string,
  referralCode?: string | null,
): Promise<{
  userId: string;
  isNewUser: boolean;
  wasMerged: boolean;
}> {
  const existingUserByEmail = await db.user.findUnique({
    where: { email },
  });

  const deviceSession = deviceId
    ? await db.mobileDeviceSession.findUnique({
        where: { deviceId },
        include: { user: true },
      })
    : null;

  const isAnonymousDevice = deviceSession && !deviceSession.user.email;

  // Scenario 1: No device session + email doesn't exist
  if (!deviceSession && !existingUserByEmail) {
    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        ...(deviceId ? { mobileDeviceSessions: { create: { deviceId } } } : {}),
      },
    });

    // Referral attribution for new mobile user
    if (referralCode) {
      const referralId = await attributeReferral(user.id, email, referralCode);
      if (referralId) {
        await issueReferralCredits(referralId);
      }
    }

    return { userId: user.id, isNewUser: true, wasMerged: false };
  }

  // Scenario 2: No device session + email exists
  if (!deviceSession && existingUserByEmail) {
    if (deviceId) {
      await db.mobileDeviceSession.create({
        data: { deviceId, userId: existingUserByEmail.id },
      });
    }
    return {
      userId: existingUserByEmail.id,
      isNewUser: false,
      wasMerged: false,
    };
  }

  // Scenario 3: Device session (anonymous) + email doesn't exist
  if (isAnonymousDevice && !existingUserByEmail) {
    await db.user.update({
      where: { id: deviceSession.userId },
      data: { email, name: name || email.split('@')[0] },
    });

    // Referral attribution for anonymous→linked user
    if (referralCode) {
      const referralId = await attributeReferral(
        deviceSession.userId,
        email,
        referralCode,
      );
      if (referralId) {
        await issueReferralCredits(referralId);
      }
    }

    return {
      userId: deviceSession.userId,
      isNewUser: false,
      wasMerged: false,
    };
  }

  // Scenario 4: Device session (anonymous) + email exists → merge
  if (isAnonymousDevice && existingUserByEmail) {
    await mergeAnonymousUserIntoTarget(
      deviceSession.userId,
      existingUserByEmail.id,
    );
    return {
      userId: existingUserByEmail.id,
      isNewUser: false,
      wasMerged: true,
    };
  }

  // Scenario 5: Device session (authenticated) + different email → switch device
  if (deviceSession && existingUserByEmail) {
    await db.mobileDeviceSession.update({
      where: { deviceId: deviceId! },
      data: { userId: existingUserByEmail.id },
    });
    return {
      userId: existingUserByEmail.id,
      isNewUser: false,
      wasMerged: false,
    };
  }

  // Scenario 5b: Device session (authenticated) + email doesn't exist → create new user, switch
  if (deviceSession && !existingUserByEmail) {
    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
      },
    });
    await db.mobileDeviceSession.update({
      where: { deviceId: deviceId! },
      data: { userId: user.id },
    });
    return { userId: user.id, isNewUser: true, wasMerged: false };
  }

  // Fallback (shouldn't reach)
  throw new Error('Unexpected auth scenario');
}
