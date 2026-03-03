'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import * as Sentry from '@sentry/nextjs';

type SessionUser = {
  dbId?: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Sets the Sentry user context based on the current session.
 * Clears user context on sign-out. Must be rendered inside <SessionProvider>.
 */
const SentryUserIdentifier = () => {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const user = session.user as SessionUser;
      Sentry.setUser({
        id: user.dbId,
        email: user.email ?? undefined,
        username: user.name ?? undefined,
      });
    } else if (status === 'unauthenticated') {
      Sentry.setUser(null);
    }
  }, [session, status]);

  return null;
};

export default SentryUserIdentifier;
