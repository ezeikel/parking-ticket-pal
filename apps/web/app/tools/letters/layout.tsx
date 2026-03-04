import type { Metadata } from 'next';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';
import { SITE_URL } from '@/constants';

export const metadata: Metadata = {
  title:
    'Free Letter Templates | Parking Tickets, Bailiffs & Motoring | Parking Ticket Pal',
  description:
    'Download free letter templates for parking ticket appeals, bailiff disputes, and motoring issues. Fill-in-the-blank templates to help you write effective letters.',
  keywords: [
    'parking ticket appeal letter',
    'parking ticket template',
    'bailiff letter template',
    'challenge parking fine',
    'pcn appeal letter',
    'parking dispute letter',
    'bailiff dispute letter',
    'motoring letter template',
  ],
  openGraph: {
    title: 'Free Letter Templates for Parking & Motoring',
    description:
      'Download free templates for parking ticket appeals, bailiff disputes, and motoring letters. Easy fill-in-the-blank format.',
    type: 'website',
  },
};

type LettersLayoutProps = {
  children: React.ReactNode;
};

const LettersLayout = ({ children }: LettersLayoutProps) => {
  const breadcrumbData = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Tools', url: `${SITE_URL}/tools` },
    { name: 'Letter Templates', url: `${SITE_URL}/tools/letters` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbData} />
      {children}
    </>
  );
};

export default LettersLayout;
