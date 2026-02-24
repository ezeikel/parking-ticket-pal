export type CompetitorCategory =
  | 'app'
  | 'professional'
  | 'diy'
  | 'inaction'
  | 'charity';

export type FeatureComparison = {
  feature: string;
  ptp: boolean | string;
  competitor: boolean | string;
};

export type FAQ = {
  question: string;
  answer: string;
};

export type Competitor = {
  id: string;
  name: string;
  shortName: string;
  category: CompetitorCategory;
  description: string;
  compareSlug: string; // e.g. "parking-ticket-pal-vs-donotpay"
  alternativeSlug: string; // e.g. "donotpay-alternatives"
  features: FeatureComparison[];
  pros: string[];
  cons: string[];
  verdict: string;
  bestFor: string;
  alternativeSearchTerms: string[];
  keywords: string[];
  faqs: FAQ[];
  whyLookForAlternatives: string[];
};
