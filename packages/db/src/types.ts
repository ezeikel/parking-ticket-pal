// Types-only exports that don't import the database client
// This file uses browser.ts which is safe to import in Edge Runtime and client side
export * from "./generated/prisma/browser";

// Re-export Prisma types and enums
export { Prisma } from "./generated/prisma/browser";

// Re-export specific model types with custom names
export type {
  User as DbUserType,
  Vehicle as DbVehicleType,
  Ticket as DbTicketType,
  Media as DbMediaType,
  Letter as DbLetterType,
  Reminder as DbReminderType,
  Form as DbFormType,
  Prediction as DbPredictionType,
  AmountIncrease as DbAmountIncreaseType,
  Verification as DbVerificationType,
  Challenge as DbChallengeType,
  Notification as DbNotificationType,
  PushToken as DbPushTokenType,
  Account as DbAccountType,
  Session as DbSessionType,
  VerificationToken as DbVerificationTokenType,
  LondonTribunalCase as DbLondonTribunalCaseType,
} from "./generated/prisma/browser";
