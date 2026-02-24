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

export const ONE_TIME_PLANS: PricingPlan[] = [
  {
    id: "standard_ticket",
    name: "Standard",
    subtitle: "Stay on top of every deadline",
    rcProductPrefix: "standard_ticket",
    popular: false,
    features: [
      { text: "Ad-free experience", included: true },
      { text: "Email & SMS reminders", included: true },
      { text: "Timeline tracking", included: true },
      { text: "Storage for letters & tickets", included: true },
      { text: "Deadline notifications", included: true },
      { text: "Success prediction score", included: true },
      { text: "AI appeal letter generation", included: false },
    ],
  },
  {
    id: "premium_ticket",
    name: "Premium",
    subtitle: "Challenge with AI — maximise your chances",
    rcProductPrefix: "premium_ticket",
    badge: "Most Popular",
    popular: true,
    features: [
      { text: "Everything in Standard", included: true },
      { text: "AI appeal letter generation", included: true },
      { text: "Success prediction score", included: true },
      { text: "Automatic challenge submission", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

export const SUBSCRIPTION_PLANS: PricingPlan[] = [
  {
    id: "standard_sub",
    name: "Standard Plan",
    subtitle: "Track deadlines & never pay double",
    rcProductPrefix: "standard_sub",
    popular: false,
    features: [
      { text: "Ad-free experience", included: true },
      { text: "Up to 5 tickets per month", included: true },
      { text: "Email & SMS reminders", included: true },
      { text: "Timeline tracking", included: true },
      { text: "Storage for letters & tickets", included: true },
      { text: "Success prediction score", included: true },
      { text: "AI appeal letter generation", included: false },
    ],
    disclaimer:
      "Fair use applies: soft cap on tickets per month; additional tickets available at per-ticket rates.",
  },
  {
    id: "premium_sub",
    name: "Premium Plan",
    subtitle: "Full challenge support — AI letters, auto-submit",
    rcProductPrefix: "premium_sub",
    badge: "Best Value",
    popular: true,
    features: [
      { text: "Ad-free experience", included: true },
      { text: "Up to 10 tickets per month", included: true },
      { text: "Everything in Standard", included: true },
      { text: "AI appeal letter generation", included: true },
      { text: "Success prediction score", included: true },
      { text: "Automatic challenge submission", included: true },
      { text: "Priority support", included: true },
    ],
  },
];
