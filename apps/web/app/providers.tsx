'use client';

import { SessionProvider } from 'next-auth/react';
import PlausibleProvider from 'next-plausible';
import { UIContextProvider } from '@/contexts/ui';
import { AccountContextProvider } from '@/contexts/account';
import SentryUserIdentifier from '@/components/SentryUserIdentifier';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <PlausibleProvider domain="parkingticketpal.com" trackOutboundLinks>
    <SessionProvider>
      <SentryUserIdentifier />
      <AccountContextProvider>
        <UIContextProvider>{children}</UIContextProvider>
      </AccountContextProvider>
    </SessionProvider>
  </PlausibleProvider>
);

export default Providers;
