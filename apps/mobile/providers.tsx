import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from 'posthog-react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthContextProvider } from "./contexts/auth";
import { PurchasesContextProvider } from "./contexts/purchases";
import { CameraProvider } from "./contexts/CameraContext";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";


export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <KeyboardProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY} options={{
            host: 'https://eu.i.posthog.com'
          }}>
            <QueryClientProvider client={queryClient}>
              <PurchasesContextProvider>
                <AuthContextProvider>
                  <CameraProvider>
                    {children}
                  </CameraProvider>
                </AuthContextProvider>
              </PurchasesContextProvider>
            </QueryClientProvider>
          </PostHogProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </KeyboardProvider>
  );
};

export default Providers;
