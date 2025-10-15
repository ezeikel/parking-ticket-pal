import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from 'posthog-react-native';
import { AuthContextProvider } from "./contexts/auth";
import { CameraProvider } from "./contexts/CameraContext";


export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
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
  );
};

export default Providers;
