// utils/prismaHelpers.ts
import { Prisma } from '@prisma/client';

export function convertPrismaDecimal(
  decimal: Prisma.Decimal | null,
): number | null {
  if (decimal === null) return null;
  return Number(decimal.toString());
}

export function convertLocationArray(
  location: Prisma.Decimal[] | null,
): number[] | null {
  if (!location) return null;
  return location.map((coord) => convertPrismaDecimal(coord) ?? 0);
}

// Type for raw ticket data from Prisma with Decimal location
export type PrismaTicketWithDecimal = {
  location: Prisma.Decimal[];
  // ... other fields
};

// Type for client-safe ticket data with number location
export type ClientTicket = {
  location: number[];
  // ... other fields
};
