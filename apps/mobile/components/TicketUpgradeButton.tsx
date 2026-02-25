import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import SquishyPressable from './SquishyPressable/SquishyPressable';

interface TicketUpgradeButtonProps {
  ticketId: string;
  currentTier: 'FREE' | 'PREMIUM';
  onUpgradeComplete?: () => void;
}

export function TicketUpgradeButton({
  ticketId,
  currentTier,
}: TicketUpgradeButtonProps) {
  const { push } = useRouter();

  const handlePress = () => {
    push({
      pathname: '/(authenticated)/paywall',
      params: { mode: 'ticket_upgrades', ticketId, source: 'feature_gate' },
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

  return (
    <SquishyPressable
      onPress={handlePress}
      className="bg-dark rounded-xl p-4"
    >
      <Text className="font-jakarta-semibold text-white text-center">
        Upgrade to Premium — £14.99
      </Text>
      <Text className="font-jakarta text-white text-xs text-center mt-1 opacity-90">
        Challenge letter, success prediction, auto-submit & more
      </Text>
    </SquishyPressable>
  );
}
