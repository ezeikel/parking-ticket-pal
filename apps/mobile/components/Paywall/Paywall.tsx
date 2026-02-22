import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePaywall } from '@/hooks/usePaywall';
import { useAnalytics } from '@/lib/analytics';
import { MAX_CONTENT_WIDTH } from '@/constants/layout';
import { useEffect } from 'react';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { Text } from 'react-native';
import { PaywallHeader } from './PaywallHeader';
import { PaywallFooter } from './PaywallFooter';
import { BillingToggle } from './BillingToggle';
import { PlanCard } from './PlanCard';

interface PaywallProps {
  mode: 'subscriptions' | 'ticket_upgrades';
  ticketId?: string;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export function Paywall({ mode, ticketId, onClose, onPurchaseComplete }: PaywallProps) {
  const insets = useSafeAreaInsets();
  const { trackEvent } = useAnalytics();

  const {
    isLoadingOfferings,
    isPurchasing,
    plans,
    billingPeriod,
    setBillingPeriod,
    selectedPlanId,
    setSelectedPlanId,
    purchasePackage,
    restorePurchases,
    getPackageForPlan,
    formatPrice,
  } = usePaywall({
    mode,
    ticketId,
    onPurchaseComplete: () => {
      onPurchaseComplete?.();
      onClose();
    },
  });

  useEffect(() => {
    trackEvent('paywall_opened', { mode });
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleContinue = () => {
    if (selectedPlan) {
      purchasePackage(selectedPlan);
    }
  };

  const title = mode === 'subscriptions' ? 'Choose Your Plan' : 'Upgrade Your Ticket';
  const subtitle =
    mode === 'subscriptions'
      ? 'Subscribe for peace of mind with every ticket.'
      : 'Unlock premium features for this ticket.';

  if (isLoadingOfferings) {
    return (
      <View className="flex-1 bg-white items-center justify-center" style={{ paddingTop: insets.top }}>
        <Loader size={32} color="#222222" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' as const }}>
      <PaywallHeader title={title} subtitle={subtitle} onClose={onClose} />

      {mode === 'subscriptions' && (
        <View className="px-6 py-4">
          <BillingToggle billingPeriod={billingPeriod} onBillingPeriodChange={setBillingPeriod} />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-4 gap-5"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
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
          />
        ))}
      </ScrollView>

      <View
        className="px-6 border-t border-border"
        style={{ paddingBottom: insets.bottom || 16 }}
      >
        <SquishyPressable
          onPress={handleContinue}
          disabled={!selectedPlan || isPurchasing}
          className="bg-dark rounded-xl p-4 mt-4"
        >
          {isPurchasing ? (
            <Loader size={20} color="#ffffff" />
          ) : (
            <Text className="font-jakarta-semibold text-white text-center text-base">
              {mode === 'ticket_upgrades' ? 'Upgrade Ticket' : 'Continue'}
            </Text>
          )}
        </SquishyPressable>

        <PaywallFooter onRestore={restorePurchases} isRestoring={isPurchasing} />
      </View>
    </View>
  );
}
