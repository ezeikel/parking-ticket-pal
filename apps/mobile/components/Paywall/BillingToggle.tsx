import { View, Text, Pressable } from 'react-native';

type BillingPeriod = 'monthly' | 'yearly';

interface BillingToggleProps {
  billingPeriod: BillingPeriod;
  onBillingPeriodChange: (period: BillingPeriod) => void;
}

export function BillingToggle({ billingPeriod, onBillingPeriodChange }: BillingToggleProps) {
  return (
    <View className="bg-light rounded-xl p-1 flex-row">
      <Pressable
        className={`flex-1 py-2.5 rounded-lg items-center ${
          billingPeriod === 'monthly' ? 'bg-dark' : ''
        }`}
        onPress={() => onBillingPeriodChange('monthly')}
      >
        <Text
          className={`font-jakarta-semibold text-sm ${
            billingPeriod === 'monthly' ? 'text-white' : 'text-gray'
          }`}
        >
          Monthly
        </Text>
      </Pressable>

      <Pressable
        className={`flex-1 py-2.5 rounded-lg items-center flex-row justify-center gap-2 ${
          billingPeriod === 'yearly' ? 'bg-dark' : ''
        }`}
        onPress={() => onBillingPeriodChange('yearly')}
      >
        <Text
          className={`font-jakarta-semibold text-sm ${
            billingPeriod === 'yearly' ? 'text-white' : 'text-gray'
          }`}
        >
          Yearly
        </Text>
        <View className="bg-teal px-2 py-0.5 rounded-full">
          <Text className="font-jakarta-semibold text-white text-xs">Save ~17%</Text>
        </View>
      </Pressable>
    </View>
  );
}
