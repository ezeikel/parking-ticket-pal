import { Suspense } from 'react';
import type { Metadata } from 'next';
import JsonLd, {
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from '@/components/JsonLd/JsonLd';
import AdBannerServer from '@/components/AdBanner/AdBannerServer';

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
      <Suspense fallback={null}>
        <AdBannerServer
          placement="tools"
          className="mx-auto max-w-[1280px] px-6 py-8"
        />
      </Suspense>
    </>
  );
};

export default ToolsLayout;
