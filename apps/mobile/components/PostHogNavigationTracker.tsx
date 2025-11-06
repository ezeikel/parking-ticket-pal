import { useEffect } from 'react';
import { useNavigationContainerRef } from 'expo-router';
import { usePostHog } from 'posthog-react-native';

/**
 * Component to integrate PostHog with Expo Router navigation tracking
 * This enables automatic screen view tracking without manual calls
 */
export const PostHogNavigationTracker = () => {
  const navigationRef = useNavigationContainerRef();
  const posthog = usePostHog();

  useEffect(() => {
    if (!navigationRef) return;

    const currentRoute = navigationRef.getCurrentRoute();

    // Track initial screen
    if (currentRoute?.name) {
      posthog.screen(currentRoute.name, currentRoute.params);
    }

    // Subscribe to navigation state changes
    const unsubscribe = navigationRef.addListener('state', () => {
      const newRoute = navigationRef.getCurrentRoute();
      if (newRoute?.name) {
        posthog.screen(newRoute.name, newRoute.params);
      }
    });

    return unsubscribe;
  }, [navigationRef, posthog]);

  return null;
};
