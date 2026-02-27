import type { Metadata } from 'next';
import JsonLd, {
  createFAQSchema,
  createBreadcrumbSchema,
} from '@/components/JsonLd/JsonLd';
import { FAQ_ITEMS } from '@/lib/pricing-data';

export const metadata: Metadata = {
  title: 'Pricing | Parking Ticket Pal',
  description:
    'Start free. Upgrade when you need to challenge. Compare our free and premium plans for fighting parking tickets.',
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={createFAQSchema(FAQ_ITEMS)} />
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: 'https://parkingticketpal.co.uk' },
          { name: 'Pricing', url: 'https://parkingticketpal.co.uk/pricing' },
        ])}
      />
      {children}
    </>
  );
}
