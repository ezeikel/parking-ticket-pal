import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pcnNumber = process.argv[2];
if (!pcnNumber) {
  console.error('Usage: node upgrade-ticket-tier.mjs <PCN_NUMBER>');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

try {
  const rows = await sql`
    UPDATE tickets
    SET tier = 'PREMIUM', "updatedAt" = ${new Date().toISOString()}
    WHERE "pcnNumber" = ${pcnNumber}
    RETURNING id, "pcnNumber", tier
  `;

  if (rows.length === 0) {
    console.error(`No ticket found with PCN: ${pcnNumber}`);
    process.exit(1);
  }

  console.log(`Upgraded ticket ${rows[0].pcnNumber} (${rows[0].id}) to PREMIUM`);
} catch (error) {
  console.error('Failed to upgrade ticket tier:', error.message);
  process.exit(1);
}
