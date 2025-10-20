import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingCarousel from '@/components/OnboardingCarousel/OnboardingCarousel';
import { useAnalytics } from '@/lib/analytics';
import { useAuthContext } from '@/contexts/auth';

const ONBOARDING_COMPLETED_KEY = '@parking_ticket_pal_onboarding_completed';

const OnboardingScreen = () => {
  const { trackScreenView, trackEvent } = useAnalytics();
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    trackScreenView('onboarding');
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');

      trackEvent('onboarding_completed', {
        screen: 'onboarding',
      });

      // If user is authenticated (viewing from settings), go back
      if (isAuthenticated) {
        router.back();
      } else {
        // Otherwise navigate to sign-in screen
        router.replace('/sign-in');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      // Still navigate even if saving fails
      if (isAuthenticated) {
        router.back();
      } else {
        router.replace('/sign-in');
      }
    }
  };

  return <OnboardingCarousel onComplete={handleOnboardingComplete} />;
};

export default OnboardingScreen;
