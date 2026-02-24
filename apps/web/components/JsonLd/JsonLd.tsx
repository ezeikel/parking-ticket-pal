type JsonLdProps = {
  data: Record<string, unknown>;
};

const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

export default JsonLd;

// Common JSON-LD schemas

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Parking Ticket Pal',
  url: 'https://parkingticketpal.co.uk',
  logo: 'https://parkingticketpal.co.uk/images/logo.png',
  description:
    'AI-powered parking ticket appeal service helping UK motorists challenge unfair PCNs.',
  sameAs: [
    'https://twitter.com/parkingticketpal',
    'https://www.facebook.com/parkingticketpal',
  ],
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Parking Ticket Pal',
  url: 'https://parkingticketpal.co.uk',
  potentialAction: {
    '@type': 'SearchAction',
    target:
      'https://parkingticketpal.co.uk/tools/reference/contravention-codes?search={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export const createFAQSchema = (
  faqs: { question: string; answer: string }[],
) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

export const createHowToSchema = (
  name: string,
  description: string,
  steps: { name: string; text: string }[],
) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  description,
  step: steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
  })),
});

export const createBreadcrumbSchema = (
  items: { name: string; url: string }[],
) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const createArticleSchema = ({
  title,
  description,
  url,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  url,
  datePublished,
  dateModified,
  author: {
    '@type': 'Organization',
    name: 'Parking Ticket Pal',
    url: 'https://parkingticketpal.co.uk',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Parking Ticket Pal',
    url: 'https://parkingticketpal.co.uk',
    logo: {
      '@type': 'ImageObject',
      url: 'https://parkingticketpal.co.uk/images/logo.png',
    },
  },
});

export const createSoftwareApplicationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Parking Ticket Pal',
  operatingSystem: 'Web',
  applicationCategory: 'UtilitiesApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'GBP',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
});
