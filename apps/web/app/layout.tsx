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

config.autoAddCss = false;

export const metadata: Metadata = {
  title:
    'Parking Ticket Pal: Manage, Track, and Challenge Parking & Penalty Charge Notices with Ease',
  description:
    'Parking Ticket Pal is your all-in-one solution for handling Parking Charge Notices (PCNs) and Penalty Charge Notices (PCNs). Track your notices, receive reminders for crucial dates, and avoid increased penalties. Utilize our AI-powered system to appeal or challenge notices effortlessly. Take control of your parking tickets today!',
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
      inter.variable,
      robotoSlab.variable,
      lato.variable,
      'font-sans',
    )}
  >
    <head>
      <PlausibleProvider domain="parkingticketpal.com" />
    </head>
    <body>
      <Providers>
        <Header />
        <main className="flex flex-col min-h-[calc(100vh-72px)] [&>div:not(#modal-root)]:flex-1 px-4">
          <div id="modal-root" />
          {children}
        </main>
        <Footer />
        <FundAccountDialog />
      </Providers>
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
    </body>
  </html>
);

export default RootLayout;
