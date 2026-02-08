import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Motoring Letter Templates | SORN, Insurance & More | Parking Ticket Pal',
  description:
    'Download free motoring letter templates. SORN declarations, change of keeper letters, insurance disputes, dealer complaints, and DVLA corrections.',
  keywords: [
    'sorn letter template',
    'change of keeper letter',
    'insurance dispute letter',
    'car dealer complaint letter',
    'dvla correction letter',
    'motoring letter template',
    'vehicle transfer letter',
    'insurance claim dispute',
  ],
  openGraph: {
    title: 'Free Motoring Letter Templates',
    description:
      'Download free templates for SORN declarations, ownership transfers, insurance disputes, and more.',
    type: 'website',
  },
};

type MotoringLayoutProps = {
  children: React.ReactNode;
};

const MotoringLayout = ({ children }: MotoringLayoutProps) => {
  return <>{children}</>;
};

export default MotoringLayout;
