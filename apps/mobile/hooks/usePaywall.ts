import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { PurchasesPackage, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { usePurchases } from '@/contexts/purchases';
import { useAnalytics } from '@/lib/analytics';
import { ONE_TIME_PLANS, SUBSCRIPTION_PLANS, type PricingPlan } from '@/constants/pricing';

type PaywallMode = 'subscriptions' | 'ticket_upgrades';
type BillingPeriod = 'monthly' | 'yearly';

interface UsePaywallOptions {
  mode: PaywallMode;
  ticketId?: string;
  onPurchaseComplete?: () => void;
}

export function usePaywall({ mode, ticketId, onPurchaseComplete }: UsePaywallOptions) {
  const { getOffering, purchasePackage: contextPurchasePackage, restorePurchases: contextRestore, refreshCustomerInfo } = usePurchases();
  const { trackEvent } = useAnalytics();

  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [offering, setOffering] = useState<any>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = mode === 'subscriptions' ? SUBSCRIPTION_PLANS : ONE_TIME_PLANS;

  // Pre-select the popular plan
  useEffect(() => {
    const popularPlan = plans.find((p) => p.popular);
    if (popularPlan) {
      setSelectedPlanId(popularPlan.id);
    }
  }, [mode]);

  // Fetch offerings from RevenueCat
  useEffect(() => {
    const fetchOffering = async () => {
      setIsLoadingOfferings(true);
      try {
        const offeringId = mode === 'subscriptions' ? 'subscriptions' : 'ticket_upgrades';
        const result = await getOffering(offeringId);
        setOffering(result);
      } catch (error) {
        console.error('[usePaywall] Error fetching offering:', error);
      } finally {
        setIsLoadingOfferings(false);
      }
    };

    fetchOffering();
  }, [mode]);

  const getPackageForPlan = useCallback(
    (plan: PricingPlan): PurchasesPackage | null => {
      if (!offering?.availablePackages) return null;

      const prefix = plan.rcProductPrefix;
      const periodSuffix = mode === 'subscriptions' ? `_${billingPeriod}` : '';
      const searchId = `${prefix}${periodSuffix}`;

      return (
        offering.availablePackages.find((pkg: PurchasesPackage) =>
          pkg.product.identifier.startsWith(searchId)
        ) ?? null
      );
    },
    [offering, billingPeriod, mode]
  );

  const formatPrice = useCallback((pkg: PurchasesPackage | null): string => {
    if (!pkg) return '---';
    return pkg.product.priceString;
  }, []);

  const hasTrialForPlan = useCallback(
    (plan: PricingPlan): boolean => {
      const pkg = getPackageForPlan(plan);
      if (!pkg) return false;
      const intro = pkg.product.introPrice;
      return intro != null && intro.price === 0;
    },
    [getPackageForPlan],
  );

  const getTrialDuration = useCallback(
    (plan: PricingPlan): string | null => {
      const pkg = getPackageForPlan(plan);
      if (!pkg) return null;
      const intro = pkg.product.introPrice;
      if (!intro || intro.price !== 0) return null;
      const count = intro.periodNumberOfUnits;
      const unit = intro.periodUnit;
      const unitLabel =
        unit === 'DAY' ? 'day' : unit === 'WEEK' ? 'week' : unit === 'MONTH' ? 'month' : 'day';
      return `${count}-${unitLabel}`;
    },
    [getPackageForPlan],
  );

  const purchasePackage = useCallback(
    async (plan: PricingPlan) => {
      const pkg = getPackageForPlan(plan);
      if (!pkg) {
        toast.error('Not Available', 'This plan is unavailable right now');
        return;
      }

      setIsPurchasing(true);

      try {
        const { customerInfo } = await contextPurchasePackage(pkg, ticketId);

        const isTrial = hasTrialForPlan(plan);

        trackEvent('paywall_purchase_success', {
          product_id: pkg.product.identifier,
          price: pkg.product.priceString,
          plan_id: plan.id,
          mode,
          is_trial: isTrial,
        });

        if (isTrial) {
          trackEvent('paywall_trial_started', {
            product_id: pkg.product.identifier,
            plan_id: plan.id,
            trial_duration: getTrialDuration(plan),
          });
        }

        await refreshCustomerInfo();

        toast.success(
          'Success',
          mode === 'subscriptions'
            ? 'Welcome! You now have access to all premium features.'
            : 'Your ticket has been upgraded successfully!'
        );
        onPurchaseComplete?.();
      } catch (error: any) {
        if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          trackEvent('paywall_purchase_cancelled', {
            plan_id: plan.id,
            mode,
          });
        } else {
          console.error('[usePaywall] Purchase error:', error);
          toast.error('Purchase Failed', 'Please try again');
        }
      } finally {
        setIsPurchasing(false);
      }
    },
    [getPackageForPlan, contextPurchasePackage, ticketId, mode, refreshCustomerInfo, onPurchaseComplete, trackEvent, hasTrialForPlan, getTrialDuration]
  );

  const restorePurchases = useCallback(async () => {
    setIsPurchasing(true);
    try {
      const info = await contextRestore();
      const hasEntitlements = Object.keys(info.entitlements.active).length > 0;

      trackEvent('paywall_restore_success');

      if (hasEntitlements) {
        toast.success('Purchases Restored', 'Your previous purchases have been restored.');
      } else {
        toast.info('No Purchases Found', 'No previous purchases on this account');
      }

      if (hasEntitlements) {
        onPurchaseComplete?.();
      }
    } catch (error) {
      console.error('[usePaywall] Restore error:', error);
      toast.error('Restore Failed', 'Please try again');
    } finally {
      setIsPurchasing(false);
    }
  }, [contextRestore, onPurchaseComplete, trackEvent]);

  const handleBillingPeriodChange = useCallback(
    (period: BillingPeriod) => {
      setBillingPeriod(period);
      trackEvent('paywall_billing_period_changed', {
        billing_period: period,
      });
    },
    [trackEvent]
  );

  return {
    isLoadingOfferings,
    isPurchasing,
    offering,
    plans,
    billingPeriod,
    setBillingPeriod: handleBillingPeriodChange,
    selectedPlanId,
    setSelectedPlanId,
    purchasePackage,
    restorePurchases,
    getPackageForPlan,
    formatPrice,
    hasTrialForPlan,
    getTrialDuration,
  };
}
