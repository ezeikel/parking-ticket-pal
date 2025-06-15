import type { User } from '@prisma/client';
import {
  $Enums,
  PredictionType,
  Prisma,
  PrismaClient,
  ReminderType,
} from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { addDays, isAfter } from 'date-fns';
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

const generateReminders = (ticket: {
  id?: string;
  issuedAt?: Date;
}): Prisma.ReminderCreateManyInput[] => {
  if (!ticket.id || !ticket.issuedAt) return [];

  const baseDate = new Date(ticket.issuedAt);

  // check if 14 days and 28 days are in the future or not before creating the reminders
  const now = new Date();
  const is14DaysInFuture = isAfter(addDays(baseDate, 14), now);
  const is28DaysInFuture = isAfter(addDays(baseDate, 28), now);

  const reminders: Prisma.ReminderCreateManyInput[] = [];

  if (is14DaysInFuture) {
    reminders.push({
      ticketId: ticket.id,
      sendAt: addDays(baseDate, 14),
      type: ReminderType.REDUCED_PAYMENT_DUE,
    });
  }

  if (is28DaysInFuture) {
    reminders.push({
      ticketId: ticket.id,
      sendAt: addDays(baseDate, 28),
      type: ReminderType.FULL_PAYMENT_DUE,
    });
  }

  return reminders;
};

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

          // Generate and create related reminders
          try {
            if (
              ticket &&
              typeof ticket.id === 'string' &&
              ticket.issuedAt instanceof Date
            ) {
              const reminders = generateReminders({
                id: ticket.id,
                issuedAt: ticket.issuedAt,
              });

              if (reminders.length > 0) {
                await client.reminder.createMany({
                  data: reminders,
                });
              }
            }
          } catch (error) {
            console.error('Failed to create reminders:', error);
          }

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
          // Check if issuedAt is being updated
          if (args.data.issuedAt !== undefined) {
            // Store the ticket ID for later use
            const ticketId = args.where?.id;

            // Proceed with the original update
            const result = await query(args);

            // Update related Reminders
            if (ticketId) {
              // First, delete existing reminders
              await client.reminder.deleteMany({
                where: { ticketId },
              });

              // Then create new reminders based on the updated ticket
              const updatedTicket = await client.ticket.findUnique({
                where: { id: ticketId },
              });

              if (updatedTicket) {
                const reminders = generateReminders({
                  id: updatedTicket.id,
                  issuedAt: updatedTicket.issuedAt,
                });

                if (reminders.length > 0) {
                  await client.reminder.createMany({
                    data: reminders,
                  });
                }
              }
            }

            // Check if relevant fields were updated
            const relevantFieldsUpdated =
              args.data.contraventionCode ||
              args.data.issuer ||
              args.data.issuerType;

            if (relevantFieldsUpdated) {
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

            return result;
          }

          // If issuedAt is not being updated, proceed normally
          return query(args);
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
