import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

class PurchaseService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      logger.debug('Already initialized, skipping', { action: 'purchases' });
      return;
    }

    try {
      const apiKey = Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        logger.error('RevenueCat API key not found', { action: 'purchases', platform: Platform.OS });
        return;
      }

      Purchases.configure({ apiKey });
      this.isInitialized = true;

      logger.info('RevenueCat initialized successfully', { action: 'purchases' });
    } catch (error) {
      logger.error('Failed to initialize RevenueCat', { action: 'purchases' }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await Purchases.getCustomerInfo();
    } catch (error) {
      logger.error('Failed to get customer info', { action: 'purchases' }, error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Failed to get offerings', { action: 'purchases' }, error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Failed to get offering', { action: 'purchases', offeringId }, error instanceof Error ? error : new Error(String(error)));
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
   * Check if user has any paid plan (Standard or Premium)
   * Users with active entitlements get an ad-free experience
   */
  async isAdFree(): Promise<boolean> {
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
      logger.error('Failed to check premium status', { action: 'purchases' }, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
}

export const purchaseService = new PurchaseService();
