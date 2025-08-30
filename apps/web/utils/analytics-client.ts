'use client';

import { useCallback } from 'react';
import { track as vercelTrackClient } from '@vercel/analytics';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import type { EventProperties, TrackingEvent } from '@/types';
import { cleanVercelProperties } from '@/utils/analytics';

type SessionUser = {
  dbId?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
};

// eslint-disable-next-line import/prefer-default-export
export const useAnalytics = () => {
  const { data: session } = useSession();

  const track = useCallback(
    <TEvent extends TrackingEvent>(
      event: TEvent,
      properties: EventProperties[TEvent],
    ) => {
      try {
        const sessionUser = session?.user as SessionUser;
        const userId = sessionUser?.dbId;
        const userProperties = sessionUser
          ? {
              email: sessionUser.email,
              name: sessionUser.name,
            }
          : undefined;

        const enrichedProperties = {
          ...properties,
          userId,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          environment: 'client',
        };

        if (typeof window !== 'undefined' && posthog && posthog.capture) {
          if (userProperties && userId) {
            posthog.identify(userId, userProperties);
          }
          posthog.capture(event, enrichedProperties);
        }

        vercelTrackClient(event, cleanVercelProperties(enrichedProperties));

        if (process.env.NODE_ENV === 'development') {
          console.log('[Analytics Client]', event, enrichedProperties);
        }
      } catch (error) {
        console.error('Client-side analytics tracking error:', error);
      }
    },
    [session],
  );

  return { track };
};
