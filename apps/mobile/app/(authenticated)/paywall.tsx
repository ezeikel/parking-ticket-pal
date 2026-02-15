import { useLocalSearchParams, useRouter } from 'expo-router';
import { Paywall } from '@/components/Paywall';

export default function PaywallScreen() {
  const router = useRouter();
  const { mode = 'subscriptions', ticketId } = useLocalSearchParams<{
    mode?: 'subscriptions' | 'ticket_upgrades';
    ticketId?: string;
  }>();

  return (
    <Paywall
      mode={mode as 'subscriptions' | 'ticket_upgrades'}
      ticketId={ticketId}
      onClose={() => router.back()}
      onPurchaseComplete={() => router.back()}
    />
  );
}
