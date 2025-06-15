import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import PlausibleProvider from 'next-plausible';
import { config } from '@fortawesome/fontawesome-svg-core';
import { Toaster } from 'sonner';
import '@fortawesome/fontawesome-svg-core/styles.css';
import cn from '@/utils/cn';
import Header from '@/components/Header/Header';
import LayoutWrap from '@/components/LayoutWrap/LayoutWrap';
import FundAccountDialog from '@/components/dialogs/FundAccountDialog/FundAccountDialog';
import Providers from './providers';
import { inter, robotoSlab, lato } from './fonts';
import '@/global.css';
import 'mapbox-gl/dist/mapbox-gl.css';

config.autoAddCss = false;

export const metadata: Metadata = {
  title:
    'Parking Ticket Pal: Manage, Track, and Challenge Parking & Penalty Charge Notices with Ease',
  description:
    'Parking Ticket Pal is your all-in-one solution for handling Parking Charge Notices (PCNs) and Penalty Charge Notices (PCNs). Track your notices, receive reminders for crucial dates, and avoid increased penalties. Utilize our AI-powered system to appeal or challenge notices effortlessly. Take control of your parking tickets today!',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        inter.variable,
        robotoSlab.variable,
        lato.variable,
        'font-sans',
      )}
    >
      <head>
        <PlausibleProvider domain="parkingticketpal.com" />
      </head>
      <body className={cn('antialiased')}>
        <Providers>
          <LayoutWrap>
            <Header className="row-start-1 row-span-1" />
            <main className="row-start-2 row-span-1">{children}</main>
            <FundAccountDialog />
          </LayoutWrap>
        </Providers>
        <Toaster richColors />
        <Analytics />
      </body>
    </html>
  );
}
