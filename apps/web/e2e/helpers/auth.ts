import { db } from '@parking-ticket-pal/db';
import type { BrowserContext } from '@playwright/test';
import { randomUUID } from 'crypto';

const TEST_USER_EMAIL = 'e2e-test@parkingticketpal.test';
const TEST_USER_NAME = 'E2E Test User';

export async function seedTestUser() {
  const user = await db.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {},
    create: {
      email: TEST_USER_EMAIL,
      name: TEST_USER_NAME,
      emailVerified: new Date(),
    },
  });

  return user;
}

export async function createAuthSession(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

export async function setAuthCookie(
  context: BrowserContext,
  sessionToken: string,
) {
  // NextAuth v5 uses "authjs.session-token" for non-HTTPS (localhost)
  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

export async function authenticateContext(context: BrowserContext) {
  const user = await seedTestUser();
  const sessionToken = await createAuthSession(user.id);
  await setAuthCookie(context, sessionToken);
  return user;
}

export async function cleanupTestUser() {
  const user = await db.user.findUnique({
    where: { email: TEST_USER_EMAIL },
  });

  if (!user) return;

  // Delete in dependency order: tickets → vehicles → sessions → user
  await db.ticket.deleteMany({
    where: { vehicle: { userId: user.id } },
  });
  await db.vehicle.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
}
