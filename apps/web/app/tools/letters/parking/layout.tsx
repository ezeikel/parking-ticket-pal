import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Parking Ticket Appeal Letter Templates | Parking Ticket Pal',
  description:
    'Download free parking ticket appeal letter templates. Templates for informal challenges, formal representations, and tribunal appeals. Challenge your PCN effectively.',
  keywords: [
    'parking ticket appeal letter',
    'pcn appeal template',
    'challenge parking fine',
    'parking ticket dispute letter',
    'informal challenge letter',
    'formal representation letter',
    'tribunal appeal letter',
    'parking notice appeal',
  ],
  openGraph: {
    title: 'Free Parking Ticket Appeal Letters',
    description:
      'Download free templates to challenge your parking ticket. Informal challenges, formal representations, and tribunal appeal letters.',
    type: 'website',
  },
};

type ParkingLayoutProps = {
  children: React.ReactNode;
};

const ParkingLayout = ({ children }: ParkingLayoutProps) => {
  return <>{children}</>;
};

export default ParkingLayout;
