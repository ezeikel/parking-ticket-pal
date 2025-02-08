import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Bitter as FontSerif, Raleway as FontSans } from 'next/font/google';
import { config } from '@fortawesome/fontawesome-svg-core';
import { Toaster } from '@/components/ui/toaster';
import '@fortawesome/fontawesome-svg-core/styles.css';
import cn from '@/utils/cn';
import Header from '@/components/Header/Header';
import LayoutWrap from '@/components/LayoutWrap/LayoutWrap';
import FundAccountDialog from '@/components/dialogs/FundAccountDialog/FundAccountDialog';
import Providers from './providers';
import '@/global.css';

config.autoAddCss = false;

const fontSerif = FontSerif({
  subsets: ['latin'],
  variable: '--font-serif',
});

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title:
    'PCNs: Manage, Track, and Challenge Parking & Penalty Charge Notices with Ease',
  description:
    'PCNs is your all-in-one solution for handling Parking Charge Notices (PCNs) and Penalty Charge Notices (PCNs). Track your notices, receive reminders for crucial dates, and avoid increased penalties. Utilize our AI-powered system to appeal or challenge notices effortlessly. Take control of your parking tickets today!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'font-serif antialiased',
          fontSerif.variable,
          fontSans.variable,
        )}
      >
        <Providers>
          <LayoutWrap>
            <Header className="row-start-1 row-span-1" />
            <main className="row-start-2 row-span-1">{children}</main>
            <FundAccountDialog />
          </LayoutWrap>
        </Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
