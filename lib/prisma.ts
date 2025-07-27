import type { User } from '@prisma/client';
import { $Enums, PredictionType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import getVehicleInfo from '@/utils/getVehicleInfo';

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

  // add Ticket-specific middleware using $extends
  return client.$extends({
    query: {
      ticket: {
        async create({ args, query }) {
          // Execute the original create operation
          const ticket = await query(args);

          // TODO: Implement ML-based prediction using historical appeals data
          await client.prediction.create({
            data: {
              ticket: {
                connect: {
                  id: ticket.id!,
                },
              },
              type: PredictionType.CHALLENGE_SUCCESS,
            },
          });

          return ticket;
        },

        async update({ args, query }) {
          // Check if relevant fields were updated
          const relevantFieldsUpdated =
            args.data.contraventionCode ||
            args.data.issuer ||
            args.data.issuerType;

          // Proceed with the original update
          const result = await query(args);

          if (relevantFieldsUpdated) {
            const ticketId = args.where?.id;

            if (ticketId) {
              // TODO: Implement ML-based prediction using historical appeals data
              // For now, just update the lastUpdated timestamp
              await client.prediction.update({
                where: { ticketId },
                data: {
                  lastUpdated: new Date(),
                  // In the future, we'll update percentage, numberOfCases, confidence, and metadata here
                },
              });
            }
          }

          return result;
        },

        async delete({ args, query }) {
          // Store the ticket ID before deletion
          const ticketId = args.where?.id;

          // Delete related reminders first (no need to find them separately)
          if (ticketId) {
            await client.reminder.deleteMany({
              where: { ticketId },
            });
          }

          // Proceed with the original delete operation
          const result = await query(args);

          return result;
        },
      },
      vehicle: {
        async create({ args, query }) {
          // Execute the original create operation
          const vehicle = await query(args);

          return vehicle;
        },
        async update({ args, query }) {
          // Execute the original update operation
          const vehicle = await query(args);

          // If registration number was updated, verify the new information
          const newRegistrationNumber = args.data.registrationNumber as
            | string
            | undefined;
          if (
            newRegistrationNumber &&
            newRegistrationNumber !== args.where.registrationNumber
          ) {
            try {
              const vehicleInfo = await getVehicleInfo(newRegistrationNumber);

              // Update vehicle with verified information
              await client.vehicle.update({
                where: { id: vehicle.id },
                data: {
                  make: vehicleInfo.make,
                  model: vehicleInfo.model,
                  bodyType: vehicleInfo.bodyType,
                  fuelType: vehicleInfo.fuelType,
                  color: vehicleInfo.color,
                  year: vehicleInfo.year,
                  verification: {
                    upsert: {
                      create: {
                        type: vehicleInfo.verification.type,
                        status: vehicleInfo.verification.status,
                        verifiedAt:
                          vehicleInfo.verification.status === 'VERIFIED'
                            ? new Date()
                            : null,
                        metadata: vehicleInfo.verification.metadata,
                      },
                      update: {
                        status: vehicleInfo.verification.status,
                        verifiedAt:
                          vehicleInfo.verification.status === 'VERIFIED'
                            ? new Date()
                            : null,
                        metadata: vehicleInfo.verification.metadata,
                      },
                    },
                  },
                } as Prisma.VehicleUpdateInput,
              });
            } catch (error) {
              console.error('Failed to verify vehicle:', error);
            }
          }

          return vehicle;
        },
      },
    },
  });
};

export const db = globalForPrisma.prisma || prismaClientSingleton();

export type { $Enums, Prisma };

export type { User as DbUserType };

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
