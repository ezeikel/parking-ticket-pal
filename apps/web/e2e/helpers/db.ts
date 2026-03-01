import { db } from '@parking-ticket-pal/db';

export function generateUniquePcn() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `E2E-${ts}-${rand}`;
}

export async function getTicketByPcn(pcnNumber: string) {
  return db.ticket.findUnique({
    where: { pcnNumber },
    include: { vehicle: true },
  });
}

export async function deleteTicketByPcn(pcnNumber: string) {
  const ticket = await db.ticket.findUnique({
    where: { pcnNumber },
    select: { id: true, vehicleId: true },
  });

  if (!ticket) return;

  // Delete ticket first (depends on vehicle)
  await db.ticket.delete({ where: { id: ticket.id } });

  // Check if vehicle has other tickets before deleting
  const remainingTickets = await db.ticket.count({
    where: { vehicleId: ticket.vehicleId },
  });

  if (remainingTickets === 0) {
    await db.vehicle.delete({ where: { id: ticket.vehicleId } });
  }
}
