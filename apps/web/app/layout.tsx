import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import { config } from '@fortawesome/fontawesome-svg-core';
import { Toaster } from 'sonner';
import '@fortawesome/fontawesome-svg-core/styles.css';
import cn from '@/utils/cn';
import HeaderWrapper from '@/components/Header/HeaderWrapper';
import FundAccountDialog from '@/components/dialogs/FundAccountDialog/FundAccountDialog';
import Footer from '@/components/Footer/Footer';
import PendingActionHandler from '@/components/PendingActionHandler';
import { FacebookPixel } from '@/components/analytics/FacebookPixel';
import Providers from './providers';
import { plusJakartaSans, robotoSlab, ukNumberPlate } from './fonts';
import '@/global.css';

config.autoAddCss = false;

export const metadata: Metadata = {
  title: 'Parking Ticket Pal: Track, Manage & Challenge UK Parking Tickets',
  description:
    'Track your parking tickets, get deadline reminders, and avoid increased fines. Parking Ticket Pal helps you manage PCNs and Penalty Charge Notices in one place — with optional challenge tools, success scores based on real tribunal data, and appeal letter generation when you need them.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/icons/favicon-16x16.png',
    apple: '/icons/apple-icon.png',
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html
    lang="en"
    className={cn(
      'antialiased relative',
      plusJakartaSans.variable,
      robotoSlab.variable,
      ukNumberPlate.variable,
      'font-sans',
    )}
  >
    <head>
      {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      )}
    </head>
    <body>
      <Suspense>
        <Providers>
          <PendingActionHandler />
          <HeaderWrapper />
          <main className="flex flex-col min-h-screen pt-[72px] [&>div:not(#modal-root)]:flex-1">
            <div id="modal-root" />
            {children}
          </main>
          <Footer />
          <FundAccountDialog />
        </Providers>
      </Suspense>
      <Toaster
        richColors
        toastOptions={{
          // Default styling for regular app notifications
          style: {
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          },
          // Custom styling for fake notifications (ios-toast class)
          className: 'default-toast',
        }}
      />
      <Analytics />
      <FacebookPixel />
    </body>
  </html>
);

export default RootLayout;
