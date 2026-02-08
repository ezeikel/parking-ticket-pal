import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UK Parking Ticket Issuers | Local Councils & Private Companies',
  description:
    'Find information about UK councils, private parking companies, and transport authorities that issue parking tickets. Learn how to appeal tickets from specific issuers.',
  keywords: [
    'parking ticket issuers',
    'uk councils parking',
    'private parking companies',
    'tfl parking tickets',
    'parking eye',
    'horizon parking',
    'council parking appeal',
    'local authority parking',
  ],
  openGraph: {
    title: 'UK Parking Ticket Issuers | Local Councils & Private Companies',
    description:
      'Find information about UK councils, private parking companies, and transport authorities that issue parking tickets.',
    type: 'website',
  },
};

export default function IssuersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
