'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type ScrollDepthThreshold = 25 | 50 | 75 | 100;

type UseScrollDepthTrackingOptions = {
  pageName: string;
  thresholds?: ScrollDepthThreshold[];
};

// eslint-disable-next-line import-x/prefer-default-export
export function useScrollDepthTracking({
  pageName,
  thresholds = [25, 50, 75, 100],
}: UseScrollDepthTrackingOptions) {
  const { track } = useAnalytics();
  const trackedThresholds = useRef<Set<number>>(new Set());

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;

    if (docHeight <= 0) return;

    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    thresholds.forEach((threshold) => {
      if (
        scrollPercent >= threshold &&
        !trackedThresholds.current.has(threshold)
      ) {
        trackedThresholds.current.add(threshold);
        track(TRACKING_EVENTS.SCROLL_DEPTH_REACHED, {
          page: pageName,
          depth: threshold,
          depth_label: `${threshold}%`,
        });
      }
    });
  }, [pageName, thresholds, track]);

  useEffect(() => {
    // Reset tracked thresholds on mount
    trackedThresholds.current = new Set();

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
}
