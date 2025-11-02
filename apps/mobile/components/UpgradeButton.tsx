import { TouchableOpacity, Text, Alert, View } from 'react-native';
import { useState } from 'react';
import { usePurchases } from '@/contexts/purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from './SquishyPressable/SquishyPressable';

interface UpgradeButtonProps {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  onUpgradeComplete?: () => void;
}

/**
 * Button to show subscription paywall
 * Use this for general "Subscribe" or "Upgrade" actions
 */
export function UpgradeButton({
  variant = 'primary',
  fullWidth = false,
  onUpgradeComplete,
}: UpgradeButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { hasActiveSubscription, hasPremiumAccess, isLoading, getOffering, refreshCustomerInfo } = usePurchases();

  const handlePress = async () => {
    setIsProcessing(true);

    try {
      // Fetch the subscriptions offering
      const offering = await getOffering('subscriptions');

      if (!offering) {
        Alert.alert('Error', 'No subscription options available. Please try again later.');
        setIsProcessing(false);
        return;
      }

      // Present RevenueCat's native paywall
      const result = await RevenueCatUI.presentPaywall({ offering });

      // Handle the result
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          // Refresh customer info to get latest entitlements
          await refreshCustomerInfo();

          Alert.alert(
            'Success',
            'Welcome to your subscription! You now have access to all premium features.',
            [
              {
                text: 'OK',
                onPress: () => onUpgradeComplete?.(),
              },
            ]
          );
          break;

        case PAYWALL_RESULT.CANCELLED:
          console.log('[Subscription] User cancelled purchase');
          break;

        case PAYWALL_RESULT.ERROR:
          Alert.alert('Error', 'Something went wrong. Please try again.');
          break;

        case PAYWALL_RESULT.NOT_PRESENTED:
          Alert.alert('Error', 'Unable to show payment options. Please try again.');
          break;
      }
    } catch (error) {
      console.error('[Subscription] Error presenting paywall:', error);
      Alert.alert('Error', 'Failed to load payment options. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show if already has premium
  if (hasPremiumAccess) {
    return null;
  }

  const isPrimary = variant === 'primary';
  const buttonClass = isPrimary
    ? 'bg-blue-600 border-blue-600'
    : 'bg-white border-gray-300 border-2';
  const textClass = isPrimary ? 'text-white' : 'text-blue-600';

  return (
    <SquishyPressable
      onPress={handlePress}
      disabled={isLoading || isProcessing}
      className={`rounded-lg p-4 ${buttonClass} ${fullWidth ? 'w-full' : ''}`}
    >
      {isProcessing ? (
        <Loader size={20} color={isPrimary ? '#ffffff' : '#2563eb'} />
      ) : (
        <Text className={`font-semibold text-center ${textClass}`}>
          {hasActiveSubscription ? 'Upgrade to Premium' : 'Subscribe Now'}
        </Text>
      )}
    </SquishyPressable>
  );
}
