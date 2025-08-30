import { Text } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuthContext } from '@/contexts/auth';

const AppLayout = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <Text>Loading...</Text>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="capture-modal" options={{ presentation: 'modal', title: 'Scan Document', headerShown: false }} />
    </Stack>
  );
}

export default AppLayout;
