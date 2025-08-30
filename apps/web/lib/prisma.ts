import type { User } from '@prisma/client';
import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;
// enable querying over fetch for edge environments (Vercel)
neonConfig.poolQueryViaFetch = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaNeon({ connectionString });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClientSingleton = () => {
  const client = new PrismaClient({
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

  return client;
};

export const db = globalForPrisma.prisma || prismaClientSingleton();

export type { $Enums, Prisma };

export type { User as DbUserType };

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
