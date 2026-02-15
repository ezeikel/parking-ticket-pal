import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingCarousel from '@/components/OnboardingCarousel/OnboardingCarousel';
import { useAnalytics } from '@/lib/analytics';

const ONBOARDING_COMPLETED_KEY = '@parking_ticket_pal_onboarding_completed';

const OnboardingScreen = () => {
  const { trackEvent } = useAnalytics();

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');

      trackEvent('onboarding_completed', {
        screen: 'onboarding',
      });

      router.replace('/(authenticated)/(tabs)');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      router.replace('/(authenticated)/(tabs)');
    }
  };

  return (
    <OnboardingCarousel
      onComplete={handleOnboardingComplete}
      onTicketCreated={(ticketId: string) =>
        trackEvent('onboarding_ticket_created', { ticketId })
      }
    />
  );
};

export default OnboardingScreen;
