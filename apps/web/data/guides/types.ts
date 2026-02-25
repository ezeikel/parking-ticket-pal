export type GuideSection = {
  id: string;
  title: string;
  content: string;
};

export type GuideFaq = {
  question: string;
  answer: string;
};

export type HowToStep = {
  name: string;
  text: string;
};

export type Guide = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  readingTime: number;
  lastUpdated: string;
  keywords: string[];
  sections: GuideSection[];
  faqs: GuideFaq[];
  howToSteps?: HowToStep[];
  relatedTools: { title: string; href: string }[];
  relatedGuides: string[]; // slugs of related guides
};
