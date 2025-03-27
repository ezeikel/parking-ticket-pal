import { Pool } from '@neondatabase/serverless';
import type { User } from '@prisma/client';
import { $Enums, Prisma, PrismaClient, ReminderType } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { addDays, isAfter } from 'date-fns';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

const connectionString = process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

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

  // Add Ticket-specific middleware using $extends
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
    },
  });
};

export const db = globalForPrisma.prisma || prismaClientSingleton();

export type { $Enums, Prisma };

export type { User as DbUserType };

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
