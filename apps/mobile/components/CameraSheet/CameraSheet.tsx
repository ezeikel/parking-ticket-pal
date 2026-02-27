import React, { useEffect, useState, useCallback } from 'react';
import { View, Dimensions, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Scanner from '@/components/Scanner/Scanner';
import TicketWizard from '@/components/TicketWizard/TicketWizard';
import { Paywall } from '@/components/Paywall/Paywall';
import { useCameraContext } from '@/contexts/CameraContext';
import { useAuthContext } from '@/contexts/auth';
import { useAnalytics } from '@/lib/analytics';
import { adService } from '@/services/AdService';
import Loader from '../Loader/Loader';
import type { OCRProcessingResult } from '@/hooks/api/useOCR';
import type { WizardResult } from '@/components/TicketWizard/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_ANIMATION_DURATION = 300;
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.3; // 30% of screen height

type CameraSheetPhase = 'scanning' | 'wizard' | 'paywall';

type CameraSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  /** When true, skip wizard/paywall and just hand off OCR data (used by OnboardingCarousel) */
  onboardingMode?: boolean;
  onOCRComplete?: (ocrResult: OCRProcessingResult) => void;
};

const CameraSheet = ({ isVisible, onClose, onboardingMode, onOCRComplete }: CameraSheetProps) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const animationStarted = useSharedValue(0); // 0 = not started, 1 = started
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [shouldShowScanner, setShouldShowScanner] = useState(false);
  const {
    cameraPermission,
    requestCameraPermission,
    requestMediaLibraryPermission,
    arePermissionsReady
  } = useCameraContext();
  const { user } = useAuthContext();
  const { trackEvent } = useAnalytics();

  // Internal phase state for non-onboarding flow
  const [phase, setPhase] = useState<CameraSheetPhase>('scanning');
  const [ocrData, setOcrData] = useState<OCRProcessingResult | null>(null);
  const [wizardResult, setWizardResult] = useState<WizardResult | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Reset all state when opening
      setIsLoadingPermissions(false);
      setShouldShowScanner(false);
      setPhase('scanning');
      setOcrData(null);
      setWizardResult(null);
      animationStarted.set(0);

      // Pre-request permissions first
      requestPermissionsIfNeeded();
    } else {
      // Clean up everything immediately when closing
      setShouldShowScanner(false);
      setIsLoadingPermissions(false);
      setScannerKey(prev => prev + 1);
      animationStarted.set(0);
      setPhase('scanning');
      setOcrData(null);
      setWizardResult(null);

      // Don't animate on close, just reset values
      translateY.set(SCREEN_HEIGHT);
    }
  }, [isVisible]);

  // Start animation only when Scanner is ready to show
  useEffect(() => {
    if (shouldShowScanner && animationStarted.get() === 0) {
      animationStarted.set(1);

      // Now start the animation - Scanner is ready
      translateY.set(withTiming(0, {
        duration: SHEET_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic)
      }));
    }
  }, [shouldShowScanner]);

  const requestPermissionsIfNeeded = useCallback(async () => {
    if (cameraPermission === 'denied' || !arePermissionsReady) {
      setIsLoadingPermissions(true);
      try {
        await Promise.all([
          requestCameraPermission(),
          requestMediaLibraryPermission()
        ]);
      } finally {
        setIsLoadingPermissions(false);
        setShouldShowScanner(true);
      }
    } else {
      setShouldShowScanner(true);
    }
  }, [cameraPermission, arePermissionsReady, requestCameraPermission, requestMediaLibraryPermission]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleOCRComplete = useCallback((result: OCRProcessingResult) => {
    if (onboardingMode && onOCRComplete) {
      // In onboarding mode, hand off to the parent (OnboardingCarousel manages wizard/paywall)
      onOCRComplete(result);
      return;
    }

    // Non-onboarding: manage wizard internally
    setOcrData(result);
    setPhase('wizard');
  }, [onboardingMode, onOCRComplete]);

  const handleWizardComplete = useCallback((result: WizardResult) => {
    setWizardResult(result);
    trackEvent('camera_wizard_completed', {
      screen: 'camera',
      intent: result.intent,
      ticket_id: result.ticketId,
    });

    if (result.intent === 'challenge') {
      // Show paywall for challenge flow
      setPhase('paywall');
    } else {
      // Track flow: show ad, then close
      (async () => {
        await adService.showAd(user?.lastPremiumPurchaseAt);
        Alert.alert('Success', 'Ticket created successfully!', [
          { text: 'OK', onPress: handleClose }
        ]);
      })();
    }
  }, [trackEvent, handleClose]);

  const handleWizardCancel = useCallback(() => {
    // Go back to scanning
    setOcrData(null);
    setPhase('scanning');
    setScannerKey(prev => prev + 1);
  }, []);

  const handlePaywallClose = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handlePurchaseComplete = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Gesture handling - only allow drag-to-dismiss during scanning phase
  const pan = Gesture.Pan()
    .enabled(phase === 'scanning')
    .onUpdate((event) => {
      const newY = Math.max(0, event.translationY);
      translateY.set(newY);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.get() > DISMISS_THRESHOLD ||
        event.velocityY > 1000;

      if (shouldDismiss) {
        runOnJS(handleClose)();
      } else {
        translateY.set(withTiming(0, {
          duration: SHEET_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic)
        }));
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    if (animationStarted.get() === 0) {
      return { opacity: 0 };
    }

    const opacity = interpolate(
      translateY.get(),
      [SCREEN_HEIGHT, 0],
      [0, 0.4],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  if (!isVisible) {
    return null;
  }

  const renderContent = () => {
    if (phase === 'wizard' && ocrData) {
      return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          <TicketWizard
            ocrData={ocrData}
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
          />
        </View>
      );
    }

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

    // Scanning phase
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        {isLoadingPermissions ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'black'
          }}>
            <Loader size={48} color="white" />
            <Text style={{
              color: 'white',
              marginTop: 16,
              fontSize: 16,
              fontFamily: 'Inter18pt-Regular'
            }}>
              Preparing Camera...
            </Text>
          </View>
        ) : shouldShowScanner ? (
          <Scanner
            key={`scanner-${scannerKey}`}
            onClose={handleClose}
            onImageScanned={() => {
              // Keep sheet open during image processing
            }}
            onOCRComplete={handleOCRComplete}
          />
        ) : (
          <View style={{
            flex: 1,
            backgroundColor: 'black'
          }} />
        )}
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
        zIndex: 1000
      }}
    >
      {/* Backdrop - only tappable during scanning phase */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'black',
            zIndex: 1001,
          },
          backdropAnimatedStyle,
        ]}
        pointerEvents={phase === 'scanning' ? 'auto' : 'none'}
      >
        {phase === 'scanning' && (
          <View style={{ flex: 1 }} onTouchEnd={handleClose} />
        )}
      </Animated.View>

      {/* Camera Sheet */}
      <GestureDetector gesture={pan}>
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
              borderTopLeftRadius: phase === 'scanning' ? 16 : 0,
              borderTopRightRadius: phase === 'scanning' ? 16 : 0,
              borderCurve: 'continuous',
            },
            sheetAnimatedStyle,
          ]}
        >
          {/* Drag Handle - only show during scanning */}
          {phase === 'scanning' && (
            <View
              style={{
                alignItems: 'center',
                paddingTop: 8,
                paddingBottom: 4,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: '#D1D5DB',
                  borderRadius: 2,
                }}
              />
            </View>
          )}

          <SafeAreaView style={{ flex: 1 }} edges={phase === 'scanning' ? ['bottom'] : []}>
            {renderContent()}
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default CameraSheet;
