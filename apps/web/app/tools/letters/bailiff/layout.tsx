import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Bailiff Response Letter Templates | Parking Ticket Pal',
  description:
    'Download free bailiff response letter templates. Dispute excessive fees, request evidence, set up payment plans, and report misconduct. Protect your rights.',
  keywords: [
    'bailiff letter template',
    'bailiff dispute letter',
    'challenge bailiff fees',
    'bailiff evidence request',
    'bailiff payment plan letter',
    'bailiff complaint letter',
    'enforcement agent dispute',
    'debt collection response',
  ],
  openGraph: {
    title: 'Free Bailiff Response Letters',
    description:
      'Download free templates to respond to bailiffs. Dispute fees, request evidence, and negotiate payment plans.',
    type: 'website',
  },
};

type BailiffLayoutProps = {
  children: React.ReactNode;
};

const BailiffLayout = ({ children }: BailiffLayoutProps) => {
  return <>{children}</>;
};

export default BailiffLayout;
