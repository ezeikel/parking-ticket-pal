import React, { useState, useCallback, useEffect } from 'react';
import { View, Dimensions, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TicketWizard from '@/components/TicketWizard/TicketWizard';
import { Paywall } from '@/components/Paywall/Paywall';
import { useAuthContext } from '@/contexts/auth';
import { useAnalytics } from '@/lib/analytics';
import { adService } from '@/services/AdService';
import type { WizardResult } from '@/components/TicketWizard/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_ANIMATION_DURATION = 300;

type ManualEntrySheetPhase = 'wizard' | 'paywall';

type ManualEntrySheetProps = {
  isVisible: boolean;
  onClose: () => void;
};

const ManualEntrySheet = ({ isVisible, onClose }: ManualEntrySheetProps) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const { user } = useAuthContext();
  const { trackEvent } = useAnalytics();

  const [phase, setPhase] = useState<ManualEntrySheetPhase>('wizard');
  const [wizardResult, setWizardResult] = useState<WizardResult | null>(null);

  useEffect(() => {
    if (isVisible) {
      setPhase('wizard');
      setWizardResult(null);

      translateY.set(withTiming(0, {
        duration: SHEET_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      }));
    } else {
      setPhase('wizard');
      setWizardResult(null);
      translateY.set(SCREEN_HEIGHT);
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleWizardComplete = useCallback((result: WizardResult) => {
    setWizardResult(result);
    trackEvent('manual_entry_wizard_completed', {
      screen: 'manual_entry',
      intent: result.intent,
      ticket_id: result.ticketId,
    });

    if (result.intent === 'challenge') {
      setPhase('paywall');
    } else {
      (async () => {
        await adService.showAd(user?.lastPremiumPurchaseAt);
        Alert.alert('Success', 'Ticket created successfully!', [
          { text: 'OK', onPress: handleClose }
        ]);
      })();
    }
  }, [trackEvent, handleClose]);

  const handleWizardCancel = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handlePaywallClose = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handlePurchaseComplete = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  if (!isVisible) {
    return null;
  }

  const renderContent = () => {
    if (phase === 'paywall' && wizardResult) {
      return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          <Paywall
            ticketId={wizardResult.ticketId}
            source="feature_gate"
            onClose={handlePaywallClose}
            onPurchaseComplete={handlePurchaseComplete}
          />
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <TicketWizard
          ocrData={null}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </View>
    );
  };

  return (
    <GestureHandlerRootView
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: SCREEN_HEIGHT,
            backgroundColor: 'white',
            zIndex: 1002,
          },
          sheetAnimatedStyle,
        ]}
      >
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </Animated.View>
    </GestureHandlerRootView>
  );
};

export default ManualEntrySheet;
