import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { PurchasesPackage, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { useQueryClient } from '@tanstack/react-query';
import { usePurchases } from '@/contexts/purchases';
import { useAnalytics } from '@/lib/analytics';
import { ONE_TIME_PLANS, type PricingPlan } from '@/constants/pricing';

interface UsePaywallOptions {
  ticketId?: string;
  onPurchaseComplete?: () => void;
}

export function usePaywall({ ticketId, onPurchaseComplete }: UsePaywallOptions) {
  const { getOffering, purchasePackage: contextPurchasePackage, restorePurchases: contextRestore, refreshCustomerInfo } = usePurchases();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();

  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [offering, setOffering] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = ONE_TIME_PLANS;

  // Pre-select the popular plan (Premium)
  useEffect(() => {
    const popularPlan = plans.find((p) => p.popular);
    if (popularPlan) {
      setSelectedPlanId(popularPlan.id);
    }
  }, []);

  // Fetch offerings from RevenueCat
  useEffect(() => {
    const fetchOffering = async () => {
      setIsLoadingOfferings(true);
      try {
        const result = await getOffering('ticket_upgrades');
        setOffering(result);
      } catch (error) {
        console.error('[usePaywall] Error fetching offering:', error);
      } finally {
        setIsLoadingOfferings(false);
      }
    };

    fetchOffering();
  }, []);

  const getPackageForPlan = useCallback(
    (plan: PricingPlan): PurchasesPackage | null => {
      if (!offering?.availablePackages) return null;

      const prefix = plan.rcProductPrefix;

      return (
        offering.availablePackages.find((pkg: PurchasesPackage) =>
          pkg.product.identifier.startsWith(prefix)
        ) ?? null
      );
    },
    [offering]
  );

  const formatPrice = useCallback((pkg: PurchasesPackage | null): string => {
    if (!pkg) return '---';
    return pkg.product.priceString;
  }, []);

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

        trackEvent('paywall_purchase_success', {
          product_id: pkg.product.identifier,
          price: pkg.product.priceString,
          plan_id: plan.id,
          mode: 'ticket_upgrades',
        });

        await refreshCustomerInfo();
        await queryClient.invalidateQueries({ queryKey: ['draftTickets'] });
        await queryClient.invalidateQueries({ queryKey: ['user'] });

        toast.success(
          'Success',
          ticketId
            ? 'Your ticket has been upgraded to Premium!'
            : 'Premium ticket created! Add your details to get started.',
        );
        onPurchaseComplete?.();
      } catch (error: any) {
        if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          trackEvent('paywall_purchase_cancelled', {
            plan_id: plan.id,
            mode: 'ticket_upgrades',
          });
        } else {
          console.error('[usePaywall] Purchase error:', error);
          toast.error('Purchase Failed', 'Please try again');
        }
      } finally {
        setIsPurchasing(false);
      }
    },
    [getPackageForPlan, contextPurchasePackage, ticketId, refreshCustomerInfo, queryClient, onPurchaseComplete, trackEvent]
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

  return {
    isLoadingOfferings,
    isPurchasing,
    offering,
    plans,
    selectedPlanId,
    setSelectedPlanId,
    purchasePackage,
    restorePurchases,
    getPackageForPlan,
    formatPrice,
  };
}
