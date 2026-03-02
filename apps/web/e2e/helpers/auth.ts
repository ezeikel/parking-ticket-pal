import { neon } from '@neondatabase/serverless';
import type { BrowserContext } from '@playwright/test';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from the web app root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined. Check apps/web/.env.local');
}

const sql = neon(DATABASE_URL);

const TEST_USER_EMAIL = 'e2e-test@parkingticketpal.test';
const TEST_USER_NAME = 'E2E Test User';

function generateCuid() {
  // Simple cuid-like ID for test purposes
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function seedTestUser() {
  // Upsert: try to find existing, otherwise create
  const existing = await sql`
    SELECT id, email, name FROM users WHERE email = ${TEST_USER_EMAIL} LIMIT 1
  `;

  if (existing.length > 0) {
    return {
      id: existing[0].id as string,
      email: existing[0].email as string,
      name: existing[0].name as string,
    };
  }

  const id = generateCuid();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO users (id, email, name, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}, ${TEST_USER_EMAIL}, ${TEST_USER_NAME}, ${now}, 'USER', ${now}, ${now})
  `;

  return { id, email: TEST_USER_EMAIL, name: TEST_USER_NAME };
}

export async function createAuthSession(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const id = generateCuid();

  await sql`
    INSERT INTO sessions (id, "sessionToken", "userId", expires)
    VALUES (${id}, ${sessionToken}, ${userId}, ${expires})
  `;

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
  const users = await sql`
    SELECT id FROM users WHERE email = ${TEST_USER_EMAIL} LIMIT 1
  `;

  if (users.length === 0) return;

  const userId = users[0].id as string;

  // Delete in dependency order: tickets → vehicles → sessions → user
  await sql`
    DELETE FROM tickets WHERE "vehicleId" IN (
      SELECT id FROM vehicles WHERE "userId" = ${userId}
    )
  `;
  await sql`DELETE FROM vehicles WHERE "userId" = ${userId}`;
  await sql`DELETE FROM sessions WHERE "userId" = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
}
