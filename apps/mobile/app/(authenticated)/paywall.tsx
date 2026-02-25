import { useLocalSearchParams, useRouter } from 'expo-router';
import { Paywall } from '@/components/Paywall';

export default function PaywallScreen() {
  const { back } = useRouter();
  const { ticketId, source } = useLocalSearchParams<{
    ticketId?: string;
    source?: 'onboarding' | 'feature_gate' | 'settings';
  }>();

  return (
    <Paywall
      ticketId={ticketId}
      source={source as 'onboarding' | 'feature_gate' | 'settings' | undefined}
      onClose={() => back()}
      onPurchaseComplete={() => back()}
    />
  );
}
