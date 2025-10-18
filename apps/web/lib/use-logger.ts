'use client';

import { createClientLogger, type LogContext } from './logger';

/**
 * Hook for client components using the same PostHog pattern as analytics.ts
 *
 * Usage:
 * ```tsx
 * 'use client';
 *
 * function MyComponent() {
 *   const logger = useLogger({ page: 'dashboard', action: 'button_click' });
 *
 *   const handleClick = () => {
 *     logger.info('User clicked button', { buttonId: 'subscribe' });
 *   };
 * }
 * ```
 *
 * Note: This uses the same PostHog integration pattern as your analytics.ts
 * - No provider required
 * - Checks for window.posthog.__loaded automatically
 * - Graceful fallback if PostHog not available
 */
export function useLogger(context?: Partial<LogContext>) {
  // Use the same clean pattern as analytics.ts
  let posthog = null;

  if (typeof window !== 'undefined') {
    const windowPosthog = (window as any).posthog;
    if (windowPosthog && windowPosthog.__loaded) {
      posthog = windowPosthog;
    }
  }

  return createClientLogger(posthog, context);
}