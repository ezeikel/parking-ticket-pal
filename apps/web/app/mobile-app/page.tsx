import type { Metadata } from 'next';
import MobileAppWaitlist from './MobileAppWaitlist';

export const metadata: Metadata = {
  title: 'Get the App — Parking Ticket Pal for iPhone & Android',
  description:
    'Track your parking tickets, get deadline reminders, and challenge fines — all from your phone. Be the first to download when we launch.',
  openGraph: {
    title: 'Get the App — Parking Ticket Pal for iPhone & Android',
    description:
      'Track your parking tickets, get deadline reminders, and challenge fines — all from your phone. Be the first to download when we launch.',
  },
};

const MobileAppPage = () => <MobileAppWaitlist />;

export default MobileAppPage;
