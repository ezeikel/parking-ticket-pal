import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { interstitialUnitId } from '../lib/ads';
import { purchaseService } from './PurchaseService';
import { logger } from '@/lib/logger';

class AdService {
  private interstitial: InterstitialAd;
  private isLoaded = false;

  constructor() {
    this.interstitial = InterstitialAd.createForAdRequest(interstitialUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    logger.info('AdService initialized', {
      action: 'ad_init',
      unitId: interstitialUnitId,
    });

    this.setupInterstitial();
  }

  private setupInterstitial() {
    try {
      this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
        this.isLoaded = true;
        logger.debug('Interstitial ad loaded', {
          action: 'ad_loaded',
        });
      });

      this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        logger.error('Interstitial ad failed to load', {
          action: 'ad_load_error',
        }, error instanceof Error ? error : new Error(String(error)));
        this.isLoaded = false;
      });

      this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        logger.info('Interstitial ad closed', {
          action: 'ad_closed',
        });
        this.isLoaded = false;
        // Preload next ad, but don't crash if it fails
        try {
          this.requestAd();
        } catch (error) {
          logger.error('Failed to request next ad after close', {
            action: 'ad_request_after_close_error',
          }, error instanceof Error ? error : new Error(String(error)));
        }
      });

      this.requestAd();
    } catch (error) {
      logger.error('Failed to setup interstitial ad listeners', {
        action: 'ad_setup_error',
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private requestAd() {
    try {
      logger.debug('Requesting interstitial ad', {
        action: 'ad_request',
      });
      this.interstitial.load();
    } catch (error) {
      logger.error('Failed to request interstitial ad', {
        action: 'ad_request',
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async showAd(): Promise<boolean> {
    try {
      const isPremium = await purchaseService.isPremium();
      if (isPremium) {
        logger.debug('Ad not shown: user is premium', {
          action: 'ad_show_skipped',
          reason: 'premium',
        });
        return false;
      }

      if (!this.isLoaded) {
        logger.warn('Ad not ready to show', {
          action: 'ad_not_ready',
        });
        this.requestAd();
        return false;
      }

      logger.info('Showing interstitial ad', {
        action: 'ad_show',
      });
      
      // Wrap native call in try-catch to catch C++ exceptions
      try {
        this.interstitial.show();
        return true;
      } catch (nativeError) {
        // Catch native SDK errors (including C++ exceptions)
        logger.error('Failed to show interstitial ad - native error', {
          action: 'ad_show_error',
          errorType: 'native_sdk',
        }, nativeError instanceof Error ? nativeError : new Error(String(nativeError)));
        this.isLoaded = false; // Mark as not loaded so we can retry
        return false;
      }
    } catch (error) {
      // Catch any other errors (e.g., from isPremium check)
      logger.error('Failed to show interstitial ad', {
        action: 'ad_show_error',
        errorType: 'general',
      }, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
}

export const adService = new AdService();
