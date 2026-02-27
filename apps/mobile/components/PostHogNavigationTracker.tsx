import { useEffect } from 'react';
import { useNavigationContainerRef } from 'expo-router';
import { usePostHog } from 'posthog-react-native';

/**
 * Component to integrate PostHog with Expo Router navigation tracking
 * This enables automatic screen view tracking without manual calls.
 *
 * Note: This component renders before the navigation container is fully
 * initialized, so getCurrentRoute() may return undefined on first render.
 * The state listener handles tracking once navigation is ready.
 */
export const PostHogNavigationTracker = () => {
  const navigationRef = useNavigationContainerRef();
  const posthog = usePostHog();

  useEffect(() => {
    if (!navigationRef) return;

    // Navigation may not be ready on initial render — guard safely
    try {
      const currentRoute = navigationRef.getCurrentRoute();
      if (currentRoute?.name) {
        posthog.screen(currentRoute.name, currentRoute.params as Record<string, string> | undefined);
      }
    } catch {
      // Navigation container not yet initialized — the state listener below
      // will pick up the initial screen once it's ready.
    }

    // Subscribe to navigation state changes
    const unsubscribe = navigationRef.addListener('state', () => {
      const newRoute = navigationRef.getCurrentRoute();
      if (newRoute?.name) {
        posthog.screen(newRoute.name, newRoute.params as Record<string, string> | undefined);
      }
    });

    return unsubscribe;
  }, [navigationRef, posthog]);

  return null;
};
