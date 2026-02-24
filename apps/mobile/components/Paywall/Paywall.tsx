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
import { BillingToggle } from './BillingToggle';
import { PlanCard } from './PlanCard';

interface PaywallProps {
  mode: 'subscriptions' | 'ticket_upgrades';
  ticketId?: string;
  source?: 'onboarding' | 'feature_gate' | 'settings';
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export function Paywall({ mode, ticketId, source, onClose, onPurchaseComplete }: PaywallProps) {
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
    hasTrialForPlan,
    getTrialDuration,
  } = usePaywall({
    mode,
    ticketId,
    onPurchaseComplete: () => {
      onPurchaseComplete?.();
      onClose();
    },
  });

  useEffect(() => {
    trackEvent('paywall_opened', { mode, source });
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedPlanHasTrial = selectedPlan ? hasTrialForPlan(selectedPlan) : false;
  const selectedPlanTrialDuration = selectedPlan ? getTrialDuration(selectedPlan) : null;
  const anyPlanHasTrial = plans.some((p) => hasTrialForPlan(p));

  const handleClose = useCallback(() => {
    trackEvent('paywall_closed_without_purchase', { mode, source });
    onClose();
  }, [mode, source, onClose, trackEvent]);

  const handleContinue = () => {
    if (selectedPlan) {
      purchasePackage(selectedPlan);
    }
  };

  const getCtaText = () => {
    if (selectedPlanHasTrial && selectedPlanTrialDuration) {
      return `Start ${selectedPlanTrialDuration} Free Trial`;
    }
    if (mode === 'ticket_upgrades') {
      return 'Unlock This Ticket';
    }
    return 'Subscribe Now';
  };

  const title =
    mode === 'subscriptions'
      ? 'Never Overpay a Parking Ticket'
      : 'Get the Full Picture';
  const subtitle =
    mode === 'subscriptions'
      ? 'Fines double after 14 days. We make sure you never miss a deadline — and help you challenge when you can win.'
      : 'See your chances of winning, get an AI-drafted appeal, and let us submit it for you.';

  if (isLoadingOfferings) {
    return (
      <View className="flex-1 bg-white items-center justify-center" style={{ paddingTop: insets.top }}>
        <Loader size={32} color="#222222" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' as const }}>
      <PaywallHeader title={title} subtitle={subtitle} onClose={handleClose} />

      <PaywallSocialProof />

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
            trialDuration={getTrialDuration(plan)}
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
          className={`rounded-xl py-3.5 mt-3 ${selectedPlanHasTrial ? 'bg-teal' : 'bg-dark'}`}
        >
          {isPurchasing ? (
            <Loader size={20} color="#ffffff" />
          ) : (
            <Text className="font-jakarta-semibold text-white text-center text-base">
              {getCtaText()}
            </Text>
          )}
        </SquishyPressable>

        <PaywallFooter
          onRestore={restorePurchases}
          isRestoring={isPurchasing}
          hasTrialEligible={anyPlanHasTrial}
        />
      </View>
    </View>
  );
}
