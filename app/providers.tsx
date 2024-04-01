'use client';

import { SessionProvider } from 'next-auth/react';
import { UIContextProvider } from '@/contexts/ui';

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <UIContextProvider>{children}</UIContextProvider>
    </SessionProvider>
  );
};

export default Providers;
