import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuthContext } from '@/contexts/auth';
import Loader from '@/components/Loader/Loader';

const AppLayout = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default AppLayout;
