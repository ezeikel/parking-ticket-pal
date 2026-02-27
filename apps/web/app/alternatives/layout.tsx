import type { Metadata } from 'next';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';

export const metadata: Metadata = {
  title: 'Parking Ticket Appeal Alternatives | Find the Best Option',
  description:
    'Explore alternatives for fighting UK parking tickets. Compare Parking Ticket Pal, solicitors, DIY appeals, Citizens Advice, and more to find the best approach for your situation.',
  keywords: [
    'parking ticket alternatives',
    'parking fine help options',
    'best parking ticket appeal uk',
    'parking ticket services compared',
  ],
};

export default function AlternativesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: 'https://parkingticketpal.co.uk' },
          {
            name: 'Alternatives',
            url: 'https://parkingticketpal.co.uk/alternatives',
          },
        ])}
      />
      {children}
    </>
  );
}
