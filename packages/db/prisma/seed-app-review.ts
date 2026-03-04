/**
 * Seed script for App Store / Play Store review test account.
 *
 * Creates testreviewer@parkingticketpal.com with:
 * - 1 vehicle
 * - 3 tickets at different statuses and tiers
 * - Predictions on the premium ticket
 * - Reminders on active tickets
 *
 * Idempotent — safe to run multiple times (uses upsert / findFirst checks).
 *
 * Usage:
 *   DATABASE_URL=<neon-connection-string> pnpm db:seed
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

const TEST_EMAIL = "testreviewer@parkingticketpal.com";
const TEST_NAME = "App Reviewer";

// Dates relative to now
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000);

async function main() {
  console.log("Seeding test reviewer account...");
  console.log(`Database: ${connectionString?.replace(/:[^@]+@/, ":****@")}`);

  // 1. Upsert the test user
  const user = await db.user.upsert({
    where: { email: TEST_EMAIL },
    update: { name: TEST_NAME },
    create: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      title: "MR",
      address: {
        line1: "10 Downing Street",
        city: "London",
        county: "Greater London",
        postcode: "SW1A 2AA",
        country: "United Kingdom",
        coordinates: { latitude: 51.5034, longitude: -0.1276 },
      },
    },
  });
  console.log(`User: ${user.id} (${user.email})`);

  // 2. Upsert vehicle
  const vehicle = await db.vehicle.upsert({
    where: {
      registrationNumber_userId: {
        registrationNumber: "AB12 CDE",
        userId: user.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      registrationNumber: "AB12 CDE",
      make: "Toyota",
      model: "Yaris",
      year: 2021,
      color: "Silver",
      bodyType: "Hatchback",
      fuelType: "Petrol",
    },
  });
  console.log(`Vehicle: ${vehicle.id} (${vehicle.registrationNumber})`);

  // 3. Create tickets (skip if PCN already exists)
  const tickets = [
    {
      pcnNumber: "LEW-REVIEW-001",
      contraventionCode: "46",
      issuer: "Lewisham Council",
      issuerType: "COUNCIL" as const,
      type: "PENALTY_CHARGE_NOTICE" as const,
      status: "ISSUED_DISCOUNT_PERIOD" as const,
      tier: "FREE" as const,
      initialAmount: 6000, // £60
      issuedAt: daysAgo(5),
      location: {
        line1: "Lewisham High Street",
        city: "London",
        county: "Greater London",
        postcode: "SE13 5JX",
        country: "United Kingdom",
        coordinates: { latitude: 51.4613, longitude: -0.0133 },
      },
      extractedText:
        "PENALTY CHARGE NOTICE\nPCN: LEW-REVIEW-001\nVehicle: AB12 CDE\nContravention Code: 46\nParked in a restricted street during prescribed hours\nDate: Recent\nAmount: £60.00\nDiscount amount if paid within 14 days: £30.00",
    },
    {
      pcnNumber: "TFL-REVIEW-002",
      contraventionCode: "MT_BUS_LANE",
      issuer: "Transport for London",
      issuerType: "TFL" as const,
      type: "PENALTY_CHARGE_NOTICE" as const,
      status: "NOTICE_TO_OWNER" as const,
      tier: "FREE" as const,
      initialAmount: 13000, // £130
      issuedAt: daysAgo(35),
      location: {
        line1: "Oxford Street",
        city: "London",
        county: "Greater London",
        postcode: "W1D 1BS",
        country: "United Kingdom",
        coordinates: { latitude: 51.5152, longitude: -0.1306 },
      },
      extractedText:
        "PENALTY CHARGE NOTICE\nPCN: TFL-REVIEW-002\nVehicle: AB12 CDE\nContravention: Driving in a bus lane\nDate: Recent\nAmount: £130.00\nNotice to Owner issued",
    },
    {
      pcnNumber: "LEW-REVIEW-003",
      contraventionCode: "12",
      issuer: "Lewisham Council",
      issuerType: "COUNCIL" as const,
      type: "PENALTY_CHARGE_NOTICE" as const,
      status: "FORMAL_REPRESENTATION" as const,
      tier: "PREMIUM" as const,
      initialAmount: 11000, // £110
      issuedAt: daysAgo(50),
      location: {
        line1: "Catford Broadway",
        city: "London",
        county: "Greater London",
        postcode: "SE6 4SP",
        country: "United Kingdom",
        coordinates: { latitude: 51.4452, longitude: -0.0209 },
      },
      extractedText:
        "PENALTY CHARGE NOTICE\nPCN: LEW-REVIEW-003\nVehicle: AB12 CDE\nContravention Code: 12\nParked in a residents' parking place without displaying a valid permit\nDate: Recent\nAmount: £110.00\nFormal representation submitted",
    },
  ];

  const createdTickets: Array<{ id: string; pcnNumber: string }> = [];

  for (const t of tickets) {
    const existing = await db.ticket.findUnique({
      where: { pcnNumber: t.pcnNumber },
    });

    if (existing) {
      console.log(`Ticket ${t.pcnNumber} already exists — skipping`);
      createdTickets.push({ id: existing.id, pcnNumber: t.pcnNumber });
      continue;
    }

    const ticket = await db.ticket.create({
      data: {
        pcnNumber: t.pcnNumber,
        contraventionCode: t.contraventionCode,
        issuer: t.issuer,
        issuerType: t.issuerType,
        type: t.type,
        status: t.status,
        tier: t.tier,
        initialAmount: t.initialAmount,
        issuedAt: t.issuedAt,
        contraventionAt: t.issuedAt,
        location: t.location,
        extractedText: t.extractedText,
        vehicleId: vehicle.id,
      },
    });
    createdTickets.push({ id: ticket.id, pcnNumber: t.pcnNumber });
    console.log(`Ticket created: ${t.pcnNumber} (${t.status}, ${t.tier})`);
  }

  // 4. Add prediction to premium ticket (LEW-REVIEW-003)
  const premiumTicket = createdTickets.find(
    (t) => t.pcnNumber === "LEW-REVIEW-003"
  );
  if (premiumTicket) {
    await db.prediction.upsert({
      where: { ticketId: premiumTicket.id },
      update: {
        percentage: 68,
        numberOfCases: 142,
        confidence: 0.82,
      },
      create: {
        ticketId: premiumTicket.id,
        type: "CHALLENGE_SUCCESS",
        percentage: 68,
        numberOfCases: 142,
        confidence: 0.82,
        metadata: {
          contraventionCode: "12",
          issuer: "lewisham",
          topPatterns: [
            "SIGNAGE_INADEQUATE",
            "PERMIT_DISPLAY_ERROR",
            "LOADING_EXEMPTION",
          ],
        },
      },
    });
    console.log("Prediction added to premium ticket (68% success)");
  }

  // 5. Add reminders to the discount-period ticket (LEW-REVIEW-001)
  const discountTicket = createdTickets.find(
    (t) => t.pcnNumber === "LEW-REVIEW-001"
  );
  if (discountTicket) {
    const existingReminders = await db.reminder.findMany({
      where: { ticketId: discountTicket.id },
    });

    if (existingReminders.length === 0) {
      await db.reminder.createMany({
        data: [
          {
            ticketId: discountTicket.id,
            type: "DISCOUNT_PERIOD",
            sendAt: daysFromNow(7),
          },
          {
            ticketId: discountTicket.id,
            type: "FULL_CHARGE",
            sendAt: daysFromNow(21),
          },
        ],
      });
      console.log("Reminders added to discount-period ticket");
    }
  }

  // 6. Add an amount increase to the NTO ticket (TFL-REVIEW-002)
  const ntoTicket = createdTickets.find(
    (t) => t.pcnNumber === "TFL-REVIEW-002"
  );
  if (ntoTicket) {
    const existingIncrease = await db.amountIncrease.findFirst({
      where: { ticketId: ntoTicket.id },
    });

    if (!existingIncrease) {
      await db.amountIncrease.create({
        data: {
          ticketId: ntoTicket.id,
          amount: 13000,
          reason: "Discount period expired — full charge now due",
          sourceType: "SYSTEM",
          effectiveAt: daysAgo(21),
        },
      });
      console.log("Amount increase added to NTO ticket");
    }
  }

  console.log("\nSeed complete!");
  console.log(`Test account: ${TEST_EMAIL}`);
  console.log("Tickets created:");
  for (const t of createdTickets) {
    console.log(`  - ${t.pcnNumber}`);
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
