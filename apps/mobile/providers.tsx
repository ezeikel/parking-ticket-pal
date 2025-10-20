import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from 'posthog-react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthContextProvider } from "./contexts/auth";
import { CameraProvider } from "./contexts/CameraContext";


export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <KeyboardProvider>
      <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY} options={{
        host: 'https://eu.i.posthog.com'
      }}>
        <QueryClientProvider client={queryClient}>
          <AuthContextProvider>
            <CameraProvider>
              {children}
            </CameraProvider>
          </AuthContextProvider>
        </QueryClientProvider>
      </PostHogProvider>
    </KeyboardProvider>
  );
};

export default Providers;
