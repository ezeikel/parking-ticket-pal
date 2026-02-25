import { View, Text, Pressable, Linking } from 'react-native';

interface PaywallFooterProps {
  onRestore: () => void;
  isRestoring: boolean;
}

export function PaywallFooter({ onRestore, isRestoring }: PaywallFooterProps) {
  return (
    <View className="pt-2 pb-1">
      {/* Restore + Terms + Privacy in one row */}
      <View className="flex-row items-center justify-center gap-3">
        <Pressable onPress={onRestore} disabled={isRestoring} hitSlop={8}>
          <Text className="font-jakarta-medium text-xs text-teal">
            {isRestoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </Pressable>
        <Text className="text-gray text-xs">·</Text>
        <Pressable onPress={() => Linking.openURL('https://parkingticketpal.com/terms')} hitSlop={8}>
          <Text className="font-jakarta text-xs text-gray">Terms</Text>
        </Pressable>
        <Text className="text-gray text-xs">·</Text>
        <Pressable onPress={() => Linking.openURL('https://parkingticketpal.com/privacy')} hitSlop={8}>
          <Text className="font-jakarta text-xs text-gray">Privacy</Text>
        </Pressable>
      </View>

      {/* Legal text */}
      <Text className="font-jakarta text-[10px] text-gray text-center mt-1.5 leading-3">
        One-time purchase per ticket. No subscriptions, no auto-renewal.
      </Text>
    </View>
  );
}
