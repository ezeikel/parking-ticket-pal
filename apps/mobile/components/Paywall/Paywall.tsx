import { useCallback, useEffect } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePaywall } from '@/hooks/usePaywall';
import { useAnalytics } from '@/lib/analytics';
import { MAX_CONTENT_WIDTH } from '@/constants/layout';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { PaywallHeader } from './PaywallHeader';
import { PaywallFooter } from './PaywallFooter';
import { PaywallSocialProof } from './PaywallSocialProof';
import { PlanCard } from './PlanCard';

interface PaywallProps {
  ticketId?: string;
  source?: 'onboarding' | 'feature_gate' | 'settings';
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export function Paywall({ ticketId, source, onClose, onPurchaseComplete }: PaywallProps) {
  const insets = useSafeAreaInsets();
  const { trackEvent } = useAnalytics();

  const {
    isLoadingOfferings,
    isPurchasing,
    plans,
    selectedPlanId,
    setSelectedPlanId,
    purchasePackage,
    restorePurchases,
    getPackageForPlan,
    formatPrice,
  } = usePaywall({
    ticketId,
    onPurchaseComplete: () => {
      onPurchaseComplete?.();
      onClose();
    },
  });

  useEffect(() => {
    trackEvent('paywall_opened', { mode: 'ticket_upgrades', source });
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleClose = useCallback(() => {
    trackEvent('paywall_closed_without_purchase', { mode: 'ticket_upgrades', source });
    onClose();
  }, [source, onClose, trackEvent]);

  const handleContinue = () => {
    if (selectedPlan) {
      purchasePackage(selectedPlan);
    }
  };

  if (isLoadingOfferings) {
    return (
      <View className="flex-1 bg-white items-center justify-center" style={{ paddingTop: insets.top }}>
        <Loader size={32} color="#222222" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' as const }}>
      <PaywallHeader
        title="Upgrade to Premium"
        subtitle="See your chances of winning, get an AI-drafted appeal, and let us submit it for you."
        onClose={handleClose}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-4 gap-5"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <PaywallSocialProof />

        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            pkg={getPackageForPlan(plan)}
            isSelected={selectedPlanId === plan.id}
            onSelect={() => {
              setSelectedPlanId(plan.id);
              trackEvent('paywall_plan_selected', {
                plan_id: plan.id,
                tier: plan.name,
              });
            }}
            formatPrice={formatPrice}
            trialDuration={null}
          />
        ))}
      </ScrollView>

      <View
        className="px-6 border-t border-border"
        style={{ paddingBottom: insets.bottom || 8 }}
      >
        <SquishyPressable
          onPress={handleContinue}
          disabled={!selectedPlan || isPurchasing}
          className="rounded-xl py-3.5 mt-3 bg-dark"
        >
          {isPurchasing ? (
            <Loader size={20} color="#ffffff" />
          ) : (
            <Text className="font-jakarta-semibold text-white text-center text-base">
              Upgrade to Premium
            </Text>
          )}
        </SquishyPressable>

        <PaywallFooter
          onRestore={restorePurchases}
          isRestoring={isPurchasing}

        />
      </View>
    </View>
  );
}
