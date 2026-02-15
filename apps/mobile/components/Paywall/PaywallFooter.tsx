import { View, Text, Pressable, Linking } from 'react-native';

interface PaywallFooterProps {
  onRestore: () => void;
  isRestoring: boolean;
}

export function PaywallFooter({ onRestore, isRestoring }: PaywallFooterProps) {
  return (
    <View className="px-6 pb-6 pt-2">
      <Pressable onPress={onRestore} disabled={isRestoring} className="items-center py-3">
        <Text className="font-jakarta-medium text-sm text-teal">
          {isRestoring ? 'Restoring...' : 'Restore Purchases'}
        </Text>
      </Pressable>

      <View className="flex-row justify-center gap-4 mt-2">
        <Pressable onPress={() => Linking.openURL('https://parkingticketpal.com/terms')}>
          <Text className="font-jakarta text-xs text-gray">Terms of Use</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL('https://parkingticketpal.com/privacy')}>
          <Text className="font-jakarta text-xs text-gray">Privacy Policy</Text>
        </Pressable>
      </View>

      <Text className="font-jakarta text-xs text-gray text-center mt-3">
        Payment will be charged to your Apple ID account at confirmation of purchase.
        Subscriptions automatically renew unless auto-renew is turned off at least 24 hours
        before the end of the current period.
      </Text>
    </View>
  );
}
