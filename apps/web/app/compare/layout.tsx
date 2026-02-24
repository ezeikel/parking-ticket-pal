import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Parking Ticket Pal | See How We Stack Up',
  description:
    'Compare Parking Ticket Pal to solicitors, DIY appeals, DoNotPay, and other options. See which approach gives you the best chance of winning your parking ticket appeal.',
  keywords: [
    'parking ticket pal comparison',
    'compare parking ticket services',
    'best parking ticket appeal',
    'parking ticket help uk',
  ],
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
