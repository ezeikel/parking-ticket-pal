// Re-export the Prisma client
export { prisma as db } from "./client";

// Re-export everything from Prisma client
export * from "./generated/prisma";

// Re-export Prisma namespace separately for explicit access
export { Prisma, type $Enums } from "./generated/prisma";

// Re-export specific model types with Db prefix for convenience
export type {
  User as DbUserType,
  Subscription as DbSubscriptionType,
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
} from "./generated/prisma";
