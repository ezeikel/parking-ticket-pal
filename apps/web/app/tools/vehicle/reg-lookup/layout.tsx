import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'Free Vehicle Check | Tax, MOT & Car Details | Parking Ticket Pal',
  description:
    'Check tax status, MOT status, emissions, and full vehicle details for any UK registered vehicle. Free instant results from official DVLA data.',
  keywords: [
    'vehicle check',
    'car reg check',
    'check vehicle tax',
    'free vehicle check',
    'dvla vehicle check',
    'car tax check',
    'registration lookup',
  ],
  openGraph: {
    title: 'Free Vehicle Check',
    description:
      'Check tax status, MOT status, and full details for any UK vehicle.',
    type: 'website',
  },
};

type VehicleLookupLayoutProps = {
  children: React.ReactNode;
};

const VehicleLookupLayout = ({ children }: VehicleLookupLayoutProps) => {
  return <>{children}</>;
};

export default VehicleLookupLayout;
