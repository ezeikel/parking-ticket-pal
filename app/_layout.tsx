import { Slot } from 'expo-router';
import Providers from "@/providers";

const RootLayout = () => {
  return (
    <Providers>
      <Slot />
    </Providers>
  );
}

export default RootLayout;
