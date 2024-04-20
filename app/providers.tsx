'use client';

import { SessionProvider } from 'next-auth/react';
import { UIContextProvider } from '@/contexts/ui';
import { AccountContextProvider } from '@/contexts/account';

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <AccountContextProvider>
        <UIContextProvider>{children}</UIContextProvider>
      </AccountContextProvider>
    </SessionProvider>
  );
};

export default Providers;
