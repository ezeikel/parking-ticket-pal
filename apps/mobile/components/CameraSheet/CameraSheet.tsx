import React, { useEffect, useState, useCallback } from 'react';
import { View, Dimensions, Text } from 'react-native';
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
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTicket } from '@fortawesome/pro-solid-svg-icons';
import { useQueryClient } from '@tanstack/react-query';
import Scanner from '@/components/Scanner/Scanner';
import TicketWizard from '@/components/TicketWizard/TicketWizard';
import LetterFlow from '@/components/LetterFlow/LetterFlow';
import { Paywall } from '@/components/Paywall/Paywall';
import { useCameraContext } from '@/contexts/CameraContext';
import { useAuthContext } from '@/contexts/auth';
import { useAnalytics } from '@/lib/analytics';
import { adService } from '@/services/AdService';
import { lookupTicketByPcn, addImageToTicket } from '@/api';
import { toast } from '@/lib/toast';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import Loader from '../Loader/Loader';
import type { OCRProcessingResult } from '@/hooks/api/useOCR';
import type { WizardResult } from '@/components/TicketWizard/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_ANIMATION_DURATION = 300;
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.3; // 30% of screen height

type CameraSheetPhase = 'scanning' | 'wizard' | 'letter' | 'duplicate' | 'paywall';

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
  const queryClient = useQueryClient();

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

  const handleOCRComplete = useCallback(async (result: OCRProcessingResult) => {
    if (onboardingMode && onOCRComplete) {
      // In onboarding mode, hand off to the parent (OnboardingCarousel manages wizard/paywall)
      onOCRComplete(result);
      return;
    }

    const documentType = result.data?.documentType || 'ticket';

    // Handle unrelated documents
    if (documentType === 'unrelated') {
      toast.info('Not a parking document', "This doesn't appear to be a parking ticket or related letter.");
      setScannerKey(prev => prev + 1);
      return;
    }

    // Handle letters
    if (documentType === 'letter') {
      setOcrData(result);
      setPhase('letter');
      return;
    }

    // Handle tickets — check for duplicates
    if (result.data?.pcnNumber) {
      try {
        const lookupResult = await lookupTicketByPcn(result.data.pcnNumber);
        if (lookupResult.ticket) {
          // Existing ticket found
          if (!lookupResult.ticket.hasTicketImage && result.imageUrl && result.tempImagePath) {
            // Ticket exists but has no image — offer to add the scanned image
            setOcrData(result);
            setPhase('duplicate');
            return;
          }
          // Ticket already has an image — show duplicate warning
          toast.info('Duplicate ticket', 'This ticket is already in your account.');
          setScannerKey(prev => prev + 1);
          return;
        }
      } catch {
        // Lookup failed — proceed with normal wizard flow
      }
    }

    // No existing ticket — proceed with normal wizard flow
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
      // Track flow: show ad, then close, then navigate to ticket
      (async () => {
        await adService.showAd(user?.lastPremiumPurchaseAt);
        toast.success('Success', 'Ticket created successfully!');
        handleClose();
        router.push(`/ticket/${result.ticketId}`);
      })();
    }
  }, [trackEvent, handleClose]);

  const handleWizardCancel = useCallback(() => {
    // Go back to scanning
    setOcrData(null);
    setPhase('scanning');
    setScannerKey(prev => prev + 1);
  }, []);

  const handleLetterComplete = useCallback((ticketId: string, isNewTicket: boolean) => {
    // Invalidate ticket list so the new/updated ticket appears
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });

    if (isNewTicket) {
      (async () => {
        await adService.showAd(user?.lastPremiumPurchaseAt);
        handleClose();
        router.push(`/ticket/${ticketId}`);
      })();
    } else {
      handleClose();
      router.push(`/ticket/${ticketId}`);
    }
  }, [handleClose, user?.lastPremiumPurchaseAt, queryClient]);

  const handleLetterCancel = useCallback(() => {
    setOcrData(null);
    setPhase('scanning');
    setScannerKey(prev => prev + 1);
  }, []);

  const handleAddImageToExisting = useCallback(async () => {
    if (!ocrData?.data?.pcnNumber || !ocrData.imageUrl || !ocrData.tempImagePath) return;

    try {
      const lookupResult = await lookupTicketByPcn(ocrData.data.pcnNumber);
      if (!lookupResult.ticket) {
        toast.error('Error', 'Could not find ticket');
        return;
      }

      await addImageToTicket(lookupResult.ticket.id, {
        tempImageUrl: ocrData.imageUrl,
        tempImagePath: ocrData.tempImagePath,
      });

      toast.success('Image added', 'Ticket image has been updated');
      handleClose();
      router.push(`/ticket/${lookupResult.ticket.id}`);
    } catch {
      toast.error('Error', 'Failed to add image to ticket');
    }
  }, [ocrData, handleClose]);

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

    if (phase === 'letter' && ocrData) {
      return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          <LetterFlow
            ocrData={ocrData}
            onComplete={handleLetterComplete}
            onCancel={handleLetterCancel}
          />
        </View>
      );
    }

    if (phase === 'duplicate' && ocrData) {
      return (
        <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#FEF3C7',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <FontAwesomeIcon icon={faTicket} size={32} color="#F59E0B" />
          </View>
          <Text style={{
            fontFamily: 'Inter18pt-Bold',
            fontSize: 20,
            color: '#111827',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Ticket already exists
          </Text>
          <Text style={{
            fontFamily: 'Inter18pt-Regular',
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 24,
          }}>
            This ticket has no image yet. Would you like to add this scan to it?
          </Text>
          <SquishyPressable
            onPress={handleAddImageToExisting}
            style={{
              backgroundColor: '#1ABC9C',
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              width: '100%',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{
              fontFamily: 'Inter18pt-SemiBold',
              fontSize: 16,
              color: 'white',
            }}>
              Add image to existing ticket
            </Text>
          </SquishyPressable>
          <SquishyPressable
            onPress={() => {
              setOcrData(null);
              setPhase('scanning');
              setScannerKey(prev => prev + 1);
            }}
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'Inter18pt-SemiBold',
              fontSize: 16,
              color: '#374151',
            }}>
              Scan different document
            </Text>
          </SquishyPressable>
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
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {isLoadingPermissions ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'white'
          }}>
            <Loader size={48} color="#222222" />
            <Text style={{
              color: '#6B7280',
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
            backgroundColor: 'white'
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
