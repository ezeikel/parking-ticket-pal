import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { hasCompletedOnboarding } from '@/utils/onboarding';
import Loader from '@/components/Loader/Loader';

const Index = () => {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await hasCompletedOnboarding();
      setOnboardingCompleted(completed);
    };
    checkOnboarding();
  }, []);

  if (onboardingCompleted === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Loader />
      </View>
    );
  }

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  // Device registration happens automatically via API interceptor
  return <Redirect href="/(authenticated)/(tabs)" />;
};

export default Index;
