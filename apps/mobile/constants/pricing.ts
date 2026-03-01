export type PlanFeature = {
  text: string;
  included: boolean;
};

export type PricingPlan = {
  id: string;
  name: string;
  subtitle: string;
  rcProductPrefix: string;
  popular: boolean;
  badge?: string;
  features: PlanFeature[];
  disclaimer?: string;
};

export const PREMIUM_PLAN: PricingPlan = {
  id: "premium_ticket",
  name: "Premium",
  subtitle: "Everything you need to challenge and win",
  rcProductPrefix: "premium_ticket",
  popular: false,
  features: [
    { text: "Challenge/appeal letter with AI assist", included: true },
    { text: "Auto-submission to council", included: true },
    { text: "Success prediction score", included: true },
    { text: "SMS reminders", included: true },
    { text: "30-day ad-free experience", included: true },
    { text: "Priority support", included: true },
  ],
};

/** Single-item array for paywall compatibility */
export const ONE_TIME_PLANS: PricingPlan[] = [PREMIUM_PLAN];
