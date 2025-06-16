import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import PlausibleProvider from 'next-plausible';
import { config } from '@fortawesome/fontawesome-svg-core';
import { Toaster } from 'sonner';
import '@fortawesome/fontawesome-svg-core/styles.css';
import cn from '@/utils/cn';
import Header from '@/components/Header/Header';
import FundAccountDialog from '@/components/dialogs/FundAccountDialog/FundAccountDialog';
import Footer from '@/components/Footer/Footer';
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
    <html lang="en">
      <head>
        <PlausibleProvider domain="parkingticketpal.com" />
      </head>
      <body
        className={cn(
          'font-sans antialiased relative',
          inter.variable,
          robotoSlab.variable,
          lato.variable,
        )}
      >
        <Providers>
          <Header />
          <main className="flex flex-col min-h-[calc(100vh-72px)] [&>div]:flex-1">
            {children}
          </main>
          <Footer />
          <FundAccountDialog />
        </Providers>
        <Toaster richColors />
        <Analytics />
      </body>
    </html>
  );
}
