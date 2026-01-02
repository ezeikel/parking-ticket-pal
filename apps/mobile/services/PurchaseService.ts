import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

class PurchaseService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      console.log('[PurchaseService] Already initialized, skipping...');
      return;
    }

    try {
      const apiKey = Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        console.error('[PurchaseService] RevenueCat API key not found for platform:', Platform.OS);
        return;
      }

      Purchases.configure({ apiKey });
      this.isInitialized = true;

      console.log('[PurchaseService] RevenueCat initialized successfully');
    } catch (error) {
      console.error('[PurchaseService] Failed to initialize RevenueCat:', error);
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('[PurchaseService] Failed to get customer info:', error);
      return null;
    }
  }

  async getOfferings(): Promise<{ all: Record<string, PurchasesOffering>; current: PurchasesOffering | null } | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await Purchases.getOfferings();
    } catch (error) {
      console.error('[PurchaseService] Failed to get offerings:', error);
      return null;
    }
  }

  async getOffering(offeringId: string): Promise<PurchasesOffering | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const offerings = await Purchases.getOfferings();
      return offerings.all[offeringId] || null;
    } catch (error) {
      console.error('[PurchaseService] Failed to get offering:', error);
      return null;
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await Purchases.purchasePackage(pkg);
  }

  async restorePurchases(): Promise<CustomerInfo> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await Purchases.restorePurchases();
  }

  async logIn(userId: string): Promise<{ customerInfo: CustomerInfo; created: boolean }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await Purchases.logIn(userId);
  }

  async logOut(): Promise<CustomerInfo> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await Purchases.logOut();
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if user has any premium plan (Standard or Ultimate)
   * This determines if ads should be hidden
   */
  async isPremium(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) {
        return false;
      }

      // Check if user has any active entitlements
      // Both Standard and Ultimate plans should have entitlements that make them ad-free
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;

      return hasActiveEntitlements;
    } catch (error) {
      console.error('[PurchaseService] Failed to check premium status:', error);
      return false;
    }
  }
}

export const purchaseService = new PurchaseService();
