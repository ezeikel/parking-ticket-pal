import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContextProvider } from "./contexts/auth";


export const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </QueryClientProvider>
  );
};

export default Providers;
