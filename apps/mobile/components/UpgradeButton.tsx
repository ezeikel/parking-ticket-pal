import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { usePurchases } from '@/contexts/purchases';
import SquishyPressable from './SquishyPressable/SquishyPressable';

interface UpgradeButtonProps {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  onUpgradeComplete?: () => void;
}

export function UpgradeButton({
  variant = 'primary',
  fullWidth = false,
}: UpgradeButtonProps) {
  const { push } = useRouter();
  const { hasActiveSubscription, hasPremiumAccess, isLoading } = usePurchases();

  const handlePress = () => {
    push({
      pathname: '/(authenticated)/paywall',
      params: { mode: 'subscriptions' },
    });
  };

  // Don't show if already has premium
  if (hasPremiumAccess) {
    return null;
  }

  const isPrimary = variant === 'primary';
  const buttonClass = isPrimary
    ? 'bg-dark'
    : 'bg-white border-border border-2';
  const textClass = isPrimary ? 'text-white' : 'text-teal';

  return (
    <SquishyPressable
      onPress={handlePress}
      disabled={isLoading}
      className={`rounded-xl p-4 ${buttonClass} ${fullWidth ? 'w-full' : ''}`}
    >
      <Text className={`font-jakarta-semibold text-center ${textClass}`}>
        {hasActiveSubscription ? 'Upgrade to Premium' : 'Subscribe Now'}
      </Text>
    </SquishyPressable>
  );
}
