import { useLocalSearchParams, useRouter } from 'expo-router';
import { Paywall } from '@/components/Paywall';

export default function PaywallScreen() {
  const { back } = useRouter();
  const { mode = 'subscriptions', ticketId } = useLocalSearchParams<{
    mode?: 'subscriptions' | 'ticket_upgrades';
    ticketId?: string;
  }>();

  return (
    <Paywall
      mode={mode as 'subscriptions' | 'ticket_upgrades'}
      ticketId={ticketId}
      onClose={() => back()}
      onPurchaseComplete={() => back()}
    />
  );
}
