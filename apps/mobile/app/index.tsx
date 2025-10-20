import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthContext } from '@/contexts/auth';
import { hasCompletedOnboarding } from '@/utils/onboarding';
import Loader from '@/components/Loader/Loader';

const Index = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await hasCompletedOnboarding();
      setOnboardingCompleted(completed);
    };
    checkOnboarding();
  }, []);

  // Show loader while checking auth and onboarding status
  if (authLoading || onboardingCompleted === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Loader />
      </View>
    );
  }

  // If user is authenticated, go to main app
  if (isAuthenticated) {
    return <Redirect href="/(authenticated)/(tabs)" />;
  }

  // If onboarding not completed, show onboarding
  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  // Otherwise, show sign-in
  return <Redirect href="/sign-in" />;
};

export default Index;
