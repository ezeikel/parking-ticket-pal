#!/usr/bin/env tsx
/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop, no-plusplus, no-continue */

/**
 * Backfill Google Street View images for all tickets with coordinates.
 * Skips tickets that already have STREET_VIEW media.
 *
 * Usage: cd apps/web && npx tsx scripts/backfill-street-view.ts
 *
 * Uses DATABASE_URL from .env.local (switch between dev/prod by changing the URL).
 */

// Env loaded via: node --env-file=.env.local
import { MediaSource, MediaType, db } from '@parking-ticket-pal/db';
import fetchStreetViewImages from '@/utils/streetView';
import { put } from '@/lib/storage';

type Address = {
  coordinates?: { latitude: number; longitude: number };
  [key: string]: unknown;
};

async function main() {
  console.log('Street View Backfill');
  console.log('====================\n');

  const apiKey = process.env.GOOGLE_STREET_VIEW_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_STREET_VIEW_API_KEY not set');
    process.exit(1);
  }

  // Find tickets with coordinates but no street view media
  const tickets = await db.ticket.findMany({
    where: {
      location: { not: { equals: undefined } },
      media: {
        none: { source: MediaSource.STREET_VIEW },
      },
    },
    select: {
      id: true,
      pcnNumber: true,
      location: true,
    },
  });

  // Filter to tickets with valid (non-zero) coordinates
  const eligible = tickets.filter((t) => {
    const loc = t.location as Address | null;
    const lat = loc?.coordinates?.latitude;
    const lng = loc?.coordinates?.longitude;
    return lat && lng && !(lat === 0 && lng === 0);
  });

  console.log(`Found ${eligible.length} tickets needing street view images\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const ticket of eligible) {
    const loc = ticket.location as Address;
    const lat = loc.coordinates!.latitude;
    const lng = loc.coordinates!.longitude;

    process.stdout.write(`${ticket.pcnNumber} (${lat}, ${lng})... `);

    try {
      const images = await fetchStreetViewImages(lat, lng);

      if (images.length === 0) {
        console.log('no coverage');
        skipped++;
        continue;
      }

      for (const img of images) {
        const path = `tickets/${ticket.id}/street-view/${img.heading}.jpg`;
        const result = await put(path, img.buffer, {
          contentType: img.contentType,
        });

        await db.media.create({
          data: {
            ticketId: ticket.id,
            url: result.url,
            type: MediaType.IMAGE,
            source: MediaSource.STREET_VIEW,
            description: `Street view heading ${img.heading}°`,
          },
        });
      }

      console.log(`${images.length} images saved`);
      success++;
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : error}`);
      failed++;
    }
  }

  console.log(
    `\nDone: ${success} success, ${skipped} no coverage, ${failed} failed`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
