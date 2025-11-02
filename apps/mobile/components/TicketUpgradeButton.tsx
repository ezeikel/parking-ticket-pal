import { TouchableOpacity, Text, View, Alert } from 'react-native';
import { useState } from 'react';
import { usePurchases } from '@/contexts/purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import useUser from '@/hooks/api/useUser';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from './SquishyPressable/SquishyPressable';

interface TicketUpgradeButtonProps {
  ticketId: string;
  currentTier: 'FREE' | 'STANDARD' | 'PREMIUM';
  onUpgradeComplete?: () => void;
}

/**
 * Button to upgrade a specific ticket
 * Shows RevenueCat paywall with consumable purchase options
 */
export function TicketUpgradeButton({
  ticketId,
  currentTier,
  onUpgradeComplete,
}: TicketUpgradeButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { hasActiveSubscription, getOffering, refreshCustomerInfo } = usePurchases();
  const { data: userData } = useUser();

  const handlePress = async () => {
    // Check if user already has active subscription
    if (hasActiveSubscription || userData?.user?.subscription) {
      Alert.alert(
        'Already Subscribed',
        'You have an active subscription that unlocks all tickets. No need to purchase individual upgrades!',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Fetch the ticket upgrades offering
      const offering = await getOffering('ticket_upgrades');

      if (!offering) {
        Alert.alert('Error', 'No upgrade options available. Please try again later.');
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
            'Your ticket has been upgraded successfully!',
            [
              {
                text: 'OK',
                onPress: () => onUpgradeComplete?.(),
              },
            ]
          );
          break;

        case PAYWALL_RESULT.CANCELLED:
          console.log('[TicketUpgrade] User cancelled purchase');
          break;

        case PAYWALL_RESULT.ERROR:
          Alert.alert('Error', 'Something went wrong. Please try again.');
          break;

        case PAYWALL_RESULT.NOT_PRESENTED:
          Alert.alert('Error', 'Unable to show payment options. Please try again.');
          break;
      }
    } catch (error) {
      console.error('[TicketUpgrade] Error presenting paywall:', error);
      Alert.alert('Error', 'Failed to load payment options. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show upgrade button if already premium
  if (currentTier === 'PREMIUM') {
    return (
      <View className="bg-green-50 border border-green-200 rounded-lg p-3">
        <Text className="text-green-700 font-semibold text-center">Premium Ticket</Text>
      </View>
    );
  }

  // Don't show if user has active subscription (already unlocked)
  if (hasActiveSubscription || userData?.user?.subscription) {
    return (
      <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <Text className="text-blue-700 font-semibold text-center">
          Unlocked with Subscription
        </Text>
      </View>
    );
  }

  console.log('isProcessing', isProcessing);

  return (
    <SquishyPressable
      onPress={handlePress}
      className="bg-blue-600 rounded-lg p-4"
      disabled={isProcessing}
    >
      {isProcessing ? (
        <View className="py-1">
          <Loader size={20} color="#ffffff" />
        </View>
      ) : (
        <>
          <Text className="text-white font-semibold text-center">
            {currentTier === 'STANDARD' ? 'Upgrade to Premium' : 'Upgrade Ticket'}
          </Text>
          <Text className="text-white text-xs text-center mt-1 opacity-90">
            Get AI predictions & premium features
          </Text>
        </>
      )}
    </SquishyPressable>
  );
}
