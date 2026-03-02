import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from the web app root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined. Check apps/web/.env.local');
}

const sql = neon(DATABASE_URL);

function generateCuid() {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateUniquePcn() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `E2E-${ts}-${rand}`;
}

export async function getTicketByPcn(pcnNumber: string) {
  const rows = await sql`
    SELECT t.id, t."pcnNumber", t.issuer, t."issuedAt", t."initialAmount", t.location,
           t.tier, v."registrationNumber"
    FROM tickets t
    JOIN vehicles v ON t."vehicleId" = v.id
    WHERE t."pcnNumber" = ${pcnNumber}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as string,
    pcnNumber: row.pcnNumber as string,
    issuer: row.issuer as string | null,
    issuedAt: row.issuedAt as string | null,
    initialAmount: row.initialAmount as number | null,
    location: row.location,
    tier: row.tier as string | null,
    vehicle: {
      registrationNumber: row.registrationNumber as string,
    },
  };
}

export async function seedVehicleForUser(
  userId: string,
  registrationNumber: string,
) {
  const id = generateCuid();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO vehicles (id, "userId", make, model, "bodyType", "fuelType", year, color, "registrationNumber", "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, 'Toyota', 'Corolla', 'Hatchback', 'Petrol', 2020, 'White', ${registrationNumber}, ${now}, ${now})
  `;

  return id;
}

export async function seedTicketForUser(
  _userId: string,
  pcnNumber: string,
  vehicleId: string,
) {
  const id = generateCuid();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO tickets (id, "pcnNumber", "extractedText", "issuedAt", "contraventionAt", type, "issuerType", "vehicleId", tier, issuer, "initialAmount", "createdAt", "updatedAt")
    VALUES (${id}, ${pcnNumber}, 'E2E test ticket text', ${now}, ${now}, 'PENALTY_CHARGE_NOTICE', 'COUNCIL', ${vehicleId}, 'FREE', 'Lewisham', 7000, ${now}, ${now})
  `;

  return id;
}

export async function upgradeTicketTier(ticketId: string, tier: string) {
  await sql`
    UPDATE tickets SET tier = ${tier}, "updatedAt" = ${new Date().toISOString()}
    WHERE id = ${ticketId}
  `;
}

export async function getChallengesByTicketId(ticketId: string) {
  const rows = await sql`
    SELECT id, "ticketId", type, reason, "customReason", status, metadata, "createdAt"
    FROM challenges WHERE "ticketId" = ${ticketId}
    ORDER BY "createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id as string,
    ticketId: row.ticketId as string,
    type: row.type as string,
    reason: row.reason as string,
    customReason: row.customReason as string | null,
    status: row.status as string,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt as string,
  }));
}

export async function deleteTicketByPcn(pcnNumber: string) {
  // Get ticket and vehicle info
  const tickets = await sql`
    SELECT id, "vehicleId" FROM tickets WHERE "pcnNumber" = ${pcnNumber}
  `;

  if (tickets.length === 0) return;

  const { id: ticketId, vehicleId } = tickets[0];

  // Delete ticket
  await sql`DELETE FROM tickets WHERE id = ${ticketId}`;

  // Check if vehicle has other tickets
  const remaining = await sql`
    SELECT COUNT(*)::int as count FROM tickets WHERE "vehicleId" = ${vehicleId}
  `;

  if (remaining[0].count === 0) {
    await sql`DELETE FROM vehicles WHERE id = ${vehicleId}`;
  }
}
