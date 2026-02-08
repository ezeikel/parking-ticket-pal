import type { Metadata } from 'next';
import JsonLd, {
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from '@/components/JsonLd/JsonLd';

export const metadata: Metadata = {
  title: 'Free Car Tools & Letter Templates | Parking Ticket Pal',
  description:
    'Free MOT checker, car valuation, vehicle lookup, and letter templates for parking tickets, bailiffs, and more. Check any UK vehicle instantly.',
  keywords: [
    'mot history check',
    'free mot check',
    'car valuation',
    'vehicle check',
    'parking ticket appeal letter',
    'bailiff letter template',
    'contravention codes',
  ],
  openGraph: {
    title: 'Free Car Tools & Letter Templates',
    description:
      'Check MOT history, get car valuations, and download free letter templates for parking appeals and bailiff disputes.',
    type: 'website',
  },
};

type ToolsLayoutProps = {
  children: React.ReactNode;
};

const ToolsLayout = ({ children }: ToolsLayoutProps) => {
  const breadcrumbData = createBreadcrumbSchema([
    { name: 'Home', url: 'https://parkingticketpal.co.uk' },
    { name: 'Tools', url: 'https://parkingticketpal.co.uk/tools' },
  ]);

  const appData = createSoftwareApplicationSchema();

  return (
    <>
      <JsonLd data={breadcrumbData} />
      <JsonLd data={appData} />
      {children}
    </>
  );
};

export default ToolsLayout;
