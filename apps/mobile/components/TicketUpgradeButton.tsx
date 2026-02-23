import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePurchases } from '@/contexts/purchases';
import useUser from '@/hooks/api/useUser';
import SquishyPressable from './SquishyPressable/SquishyPressable';

interface TicketUpgradeButtonProps {
  ticketId: string;
  currentTier: 'FREE' | 'STANDARD' | 'PREMIUM';
  onUpgradeComplete?: () => void;
}

export function TicketUpgradeButton({
  ticketId,
  currentTier,
}: TicketUpgradeButtonProps) {
  const { push } = useRouter();
  const { hasActiveSubscription } = usePurchases();
  const { data: userData } = useUser();

  const handlePress = () => {
    push({
      pathname: '/(authenticated)/paywall',
      params: { mode: 'ticket_upgrades', ticketId },
    });
  };

  // Don't show upgrade button if already premium
  if (currentTier === 'PREMIUM') {
    return (
      <View className="bg-success/10 border border-success/20 rounded-2xl p-3">
        <Text className="font-jakarta-semibold text-success text-center">Premium Ticket</Text>
      </View>
    );
  }

  // Don't show if user has active subscription (already unlocked)
  if (hasActiveSubscription || userData?.user?.subscription) {
    return (
      <View className="bg-teal/10 border border-teal/20 rounded-2xl p-3">
        <Text className="font-jakarta-semibold text-teal text-center">
          Unlocked with Subscription
        </Text>
      </View>
    );
  }

  return (
    <SquishyPressable
      onPress={handlePress}
      className="bg-dark rounded-xl p-4"
    >
      <Text className="font-jakarta-semibold text-white text-center">
        {currentTier === 'STANDARD' ? 'Upgrade to Premium' : 'Upgrade Ticket'}
      </Text>
      <Text className="font-jakarta text-white text-xs text-center mt-1 opacity-90">
        Get AI predictions & premium features
      </Text>
    </SquishyPressable>
  );
}
