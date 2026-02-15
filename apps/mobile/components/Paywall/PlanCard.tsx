import { View, Text, Pressable } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { perfect } from '@/styles';
import { FeatureRow } from './FeatureRow';
import type { PricingPlan } from '@/constants/pricing';

interface PlanCardProps {
  plan: PricingPlan;
  pkg: PurchasesPackage | null;
  isSelected: boolean;
  onSelect: () => void;
  formatPrice: (pkg: PurchasesPackage | null) => string;
}

export function PlanCard({ plan, pkg, isSelected, onSelect, formatPrice }: PlanCardProps) {
  const price = formatPrice(pkg);

  return (
    <Pressable onPress={onSelect}>
      <View
        className={`bg-white rounded-2xl p-6 relative ${
          isSelected ? 'border-2 border-dark' : 'border border-border'
        }`}
        style={perfect.cardShadow}
      >
        {plan.badge && (
          <View className="absolute -top-3 right-4 bg-dark px-3 py-1 rounded-full">
            <Text className="font-jakarta-semibold text-white text-xs">{plan.badge}</Text>
          </View>
        )}

        <Text className="font-jakarta-bold text-xl text-dark">{plan.name}</Text>
        <Text className="font-jakarta text-sm text-gray mt-1">{plan.subtitle}</Text>

        <View className="flex-row items-baseline mt-4 mb-4">
          <Text className="font-jakarta-extrabold text-4xl text-dark">{price}</Text>
        </View>

        <View className="border-t border-border pt-4">
          {plan.features.map((feature) => (
            <FeatureRow key={feature.text} text={feature.text} included={feature.included} />
          ))}
        </View>

        {plan.disclaimer && (
          <Text className="font-jakarta text-xs text-gray mt-3">{plan.disclaimer}</Text>
        )}
      </View>
    </Pressable>
  );
}
