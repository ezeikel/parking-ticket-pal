import { useLocalSearchParams, useRouter } from 'expo-router';
import { Paywall } from '@/components/Paywall';

export default function PaywallScreen() {
  const { back } = useRouter();
  const { mode = 'subscriptions', ticketId, source } = useLocalSearchParams<{
    mode?: 'subscriptions' | 'ticket_upgrades';
    ticketId?: string;
    source?: 'onboarding' | 'feature_gate' | 'settings';
  }>();

  return (
    <Paywall
      mode={mode as 'subscriptions' | 'ticket_upgrades'}
      ticketId={ticketId}
      source={source as 'onboarding' | 'feature_gate' | 'settings' | undefined}
      onClose={() => back()}
      onPurchaseComplete={() => back()}
    />
  );
}
