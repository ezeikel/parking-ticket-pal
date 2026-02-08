import type { Metadata } from 'next';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';

export const metadata: Metadata = {
  title: 'Free Letter Templates | Parking Tickets, Bailiffs & Motoring | Parking Ticket Pal',
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
    { name: 'Home', url: 'https://parkingticketpal.co.uk' },
    { name: 'Tools', url: 'https://parkingticketpal.co.uk/tools' },
    { name: 'Letter Templates', url: 'https://parkingticketpal.co.uk/tools/letters' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbData} />
      {children}
    </>
  );
};

export default LettersLayout;
