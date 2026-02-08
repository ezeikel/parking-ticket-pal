import type { Metadata } from 'next';
import JsonLd, {
  createBreadcrumbSchema,
  createHowToSchema,
} from '@/components/JsonLd/JsonLd';

export const metadata: Metadata = {
  title: 'Free MOT History Check | Check Any UK Vehicle | Parking Ticket Pal',
  description:
    'Check the MOT history of any UK vehicle for free. See test results, advisories, mileage records, and expiry dates. Official DVLA data.',
  keywords: [
    'mot history check',
    'free mot check',
    'check mot status',
    'mot test history',
    'vehicle mot check',
    'dvla mot check',
    'car mot history',
  ],
  openGraph: {
    title: 'Free MOT History Check',
    description:
      'Check the MOT history of any UK vehicle. See test results, advisories, and mileage records.',
    type: 'website',
  },
};

type MOTCheckLayoutProps = {
  children: React.ReactNode;
};

const MOTCheckLayout = ({ children }: MOTCheckLayoutProps) => {
  const breadcrumbData = createBreadcrumbSchema([
    { name: 'Home', url: 'https://parkingticketpal.co.uk' },
    { name: 'Tools', url: 'https://parkingticketpal.co.uk/tools' },
    { name: 'Vehicle Tools', url: 'https://parkingticketpal.co.uk/tools/vehicle' },
    { name: 'MOT History Check', url: 'https://parkingticketpal.co.uk/tools/vehicle/mot-check' },
  ]);

  const howToData = createHowToSchema(
    'How to Check MOT History',
    'Check the full MOT history of any UK vehicle using its registration number.',
    [
      { name: 'Enter Registration', text: 'Type the vehicle registration number in the search box.' },
      { name: 'Click Search', text: 'Click the search button to fetch the MOT history.' },
      { name: 'View Results', text: 'See the complete MOT history including test results, advisories, and mileage.' },
    ],
  );

  return (
    <>
      <JsonLd data={breadcrumbData} />
      <JsonLd data={howToData} />
      {children}
    </>
  );
};

export default MOTCheckLayout;
