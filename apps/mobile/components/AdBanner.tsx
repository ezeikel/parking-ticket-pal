import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { purchaseService } from '../services/PurchaseService';
import { useAuthContext } from '../contexts/auth';
import { bannerUnitId } from '../lib/ads';
import { logger } from '@/lib/logger';

interface AdBannerProps {
  placement: 'tickets' | 'settings' | 'vehicles' | 'ticket-detail';
  size?: BannerAdSize;
}

export const AdBanner: React.FC<AdBannerProps> = ({ placement, size = BannerAdSize.BANNER }) => {
  const { user } = useAuthContext();
  const [isAdFree, setIsAdFree] = useState(false);

  useEffect(() => {
    const checkAdFreeStatus = async () => {
      const adFree = await purchaseService.isAdFree(user?.lastPremiumPurchaseAt);
      setIsAdFree(adFree);

      logger.debug('Banner ad status checked', {
        action: 'banner_check',
        placement,
        isAdFree: adFree,
      });
    };
    checkAdFreeStatus();
  }, [placement, user?.lastPremiumPurchaseAt]);

  if (isAdFree) {
    return null; // Premium purchasers get 30 days ad-free
  }

  return (
    <View className="items-center py-2">
      <BannerAd
        unitId={bannerUnitId(placement)}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          logger.error('Banner ad failed to load', {
            action: 'banner_load_error',
            placement,
          }, error instanceof Error ? error : new Error(String(error)));
        }}
      />
    </View>
  );
};
