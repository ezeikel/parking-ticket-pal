import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { confirmPurchase } from '@/api';
import { purchaseService } from '@/services/PurchaseService';

type PurchasesContextType = {
  isConfigured: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering[] | null;
  currentOffering: PurchasesOffering | null;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  hasStandardAccess: boolean;
  hasPremiumAccess: boolean;
  purchasePackage: (pkg: PurchasesPackage, ticketId?: string) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<void>;
  getOffering: (offeringId: string) => Promise<PurchasesOffering | null>;
};

type PurchasesContextProviderProps = {
  children: ReactNode;
};

export const PurchasesContext = createContext<PurchasesContextType>({
  isConfigured: false,
  customerInfo: null,
  offerings: null,
  currentOffering: null,
  isLoading: true,
  hasActiveSubscription: false,
  hasStandardAccess: false,
  hasPremiumAccess: false,
  purchasePackage: async () => ({ customerInfo: {} as CustomerInfo }),
  restorePurchases: async () => ({} as CustomerInfo),
  refreshCustomerInfo: async () => {},
  getOffering: async () => null,
});

export const PurchasesContextProvider = ({ children }: PurchasesContextProviderProps) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering[] | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load purchase data once PurchaseService is initialized
  useEffect(() => {
    const loadPurchaseData = async () => {
      try {
        // PurchaseService is already initialized in _layout.tsx
        // Just load the data here
        const info = await purchaseService.getCustomerInfo();
        if (info) {
          setCustomerInfo(info);
        }

        const offeringsData = await purchaseService.getOfferings();
        if (offeringsData?.all) {
          setOfferings(Object.values(offeringsData.all));
        }
        if (offeringsData?.current) {
          setCurrentOffering(offeringsData.current);
        }

        setIsConfigured(purchaseService.getIsInitialized());
        console.log('[PurchasesContext] Loaded purchase data successfully');
      } catch (error) {
        console.error('[PurchasesContext] Error loading purchase data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPurchaseData();
  }, []);

  // Check if user has active subscription
  const hasActiveSubscription =
    customerInfo?.entitlements.active['standard_access'] !== undefined ||
    customerInfo?.entitlements.active['premium_access'] !== undefined;

  const hasStandardAccess = customerInfo?.entitlements.active['standard_access'] !== undefined;
  const hasPremiumAccess = customerInfo?.entitlements.active['premium_access'] !== undefined;

  /**
   * Purchase a package (subscription or consumable)
   * For consumables, pass ticketId to apply the upgrade
   */
  const purchasePackage = async (
    pkg: PurchasesPackage,
    ticketId?: string
  ): Promise<{ customerInfo: CustomerInfo }> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(customerInfo);

      // If this is a consumable purchase (ticket upgrade), confirm with backend
      const productId = pkg.product.identifier;
      if (
        ticketId &&
        (productId.startsWith('standard_ticket') || productId.startsWith('premium_ticket'))
      ) {
        try {
          await confirmPurchase(ticketId, productId);
          console.log('[Purchases] Ticket upgrade confirmed with backend');
        } catch (error) {
          console.error('[Purchases] Error confirming purchase with backend:', error);
          // Don't throw - purchase went through, just backend confirmation failed
        }
      }

      return { customerInfo };
    } catch (error: any) {
      // Handle specific error cases
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.log('[Purchases] User cancelled purchase');
      } else if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        console.log('[Purchases] Product already purchased');
      } else {
        console.error('[Purchases] Purchase error:', error);
      }
      throw error;
    }
  };

  /**
   * Restore previous purchases
   * Useful for users who reinstalled the app or switched devices
   */
  const restorePurchases = async (): Promise<CustomerInfo> => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      console.log('[Purchases] Purchases restored successfully');
      return info;
    } catch (error) {
      console.error('[Purchases] Error restoring purchases:', error);
      throw error;
    }
  };

  /**
   * Refresh customer info to get latest entitlements
   */
  const refreshCustomerInfo = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('[Purchases] Error refreshing customer info:', error);
    }
  };

  /**
   * Get a specific offering by ID
   * Useful for fetching different offerings (e.g., 'ticket_upgrades', 'subscriptions')
   */
  const getOffering = async (offeringId: string): Promise<PurchasesOffering | null> => {
    try {
      // Use the purchaseService which handles initialization
      const offering = await purchaseService.getOffering(offeringId);

      // Log what we got back
      console.log('[Purchases] Looking for offering:', offeringId);
      console.log('[Purchases] Found offering:', offering ? 'YES' : 'NO');

      if (offering) {
        console.log('[Purchases] Offering packages:', offering.availablePackages.length);
      }

      return offering;
    } catch (error) {
      console.error('[Purchases] Error fetching offering:', error);
      return null;
    }
  };

  return (
    <PurchasesContext.Provider
      value={{
        isConfigured,
        customerInfo,
        offerings,
        currentOffering,
        isLoading,
        hasActiveSubscription,
        hasStandardAccess,
        hasPremiumAccess,
        purchasePackage,
        restorePurchases,
        refreshCustomerInfo,
        getOffering,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  );
};

export const usePurchases = () => {
  const context = useContext(PurchasesContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchasesContextProvider');
  }
  return context;
};
