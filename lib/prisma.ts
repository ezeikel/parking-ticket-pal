/* eslint-disable no-param-reassign */

// ts-ignore 7017 is used to ignore the error that the global object is not
// defined in the global scope. This is because the global object is only
// defined in the global scope in Node.js and not in the browser.

import { Pool } from '@neondatabase/serverless';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

const connectionString = process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? [
            {
              emit: 'event',
              level: 'query',
            },
          ]
        : undefined,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
