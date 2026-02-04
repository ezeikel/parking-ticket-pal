'use client';

import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/utils/analytics-client';
import type { TrackingEvent, EventProperties } from '@/types';

interface PageViewTrackerProps<T extends TrackingEvent> {
  eventName: T;
  properties?: EventProperties[T];
}

export function PageViewTracker<T extends TrackingEvent>({
  eventName,
  properties,
}: PageViewTrackerProps<T>) {
  const { track } = useAnalytics();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      track(eventName, properties as EventProperties[T]);
      hasTracked.current = true;
    }
  }, [eventName, properties, track]);

  return null;
}
