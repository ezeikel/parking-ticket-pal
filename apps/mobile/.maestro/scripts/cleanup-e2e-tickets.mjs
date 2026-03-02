import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

try {
  // Find all E2E test tickets
  const tickets = await sql`
    SELECT id, "pcnNumber", "vehicleId"
    FROM tickets
    WHERE "pcnNumber" LIKE 'E2E-MAESTRO-%'
  `;

  if (tickets.length === 0) {
    console.log('No E2E test tickets to clean up');
    process.exit(0);
  }

  const ticketIds = tickets.map((t) => t.id);
  const vehicleIds = [...new Set(tickets.map((t) => t.vehicleId))];

  // Delete challenges associated with these tickets
  await sql`DELETE FROM challenges WHERE "ticketId" = ANY(${ticketIds})`;

  // Delete tickets
  await sql`DELETE FROM tickets WHERE id = ANY(${ticketIds})`;

  // Delete orphaned vehicles (those with no remaining tickets)
  for (const vehicleId of vehicleIds) {
    const remaining = await sql`
      SELECT COUNT(*)::int as count FROM tickets WHERE "vehicleId" = ${vehicleId}
    `;
    if (remaining[0].count === 0) {
      await sql`DELETE FROM vehicles WHERE id = ${vehicleId}`;
    }
  }

  console.log(`Cleaned up ${tickets.length} E2E test ticket(s): ${tickets.map((t) => t.pcnNumber).join(', ')}`);
} catch (error) {
  console.error('Failed to clean up E2E tickets:', error.message);
  process.exit(1);
}
