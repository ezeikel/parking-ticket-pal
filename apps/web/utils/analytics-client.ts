'use client';

import { useCallback } from 'react';
import { track as vercelTrackClient } from '@vercel/analytics';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import type { EventProperties, TrackingEvent } from '@/types';
import { cleanVercelProperties } from '@/utils/analytics';

/**
 * Link an anonymous PostHog user to an authenticated user.
 * Call this after auth to connect pre-signup activity with the new user.
 */
export const linkAnonymousUser = (userId: string) => {
  if (typeof window === 'undefined' || !posthog) return;

  try {
    const anonymousId = posthog.get_distinct_id();

    // Only alias if the anonymous ID is different from the user ID
    // and looks like an anonymous ID (not already a user ID)
    if (anonymousId && anonymousId !== userId && !anonymousId.startsWith('user_')) {
      // Alias links the anonymous ID to the user ID
      posthog.alias(userId, anonymousId);
    }

    // Identify sets the user ID for future events
    posthog.identify(userId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Linked anonymous user', { anonymousId, userId });
    }
  } catch (error) {
    console.error('Error linking anonymous user:', error);
  }
};

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
