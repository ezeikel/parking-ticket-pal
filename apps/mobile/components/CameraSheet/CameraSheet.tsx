import React, { useEffect, useState, useCallback } from 'react';
import { View, Dimensions, Text } from 'react-native';
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
import VisionCameraScanner from '@/components/VisionCameraScanner/VisionCameraScanner';
import { useCameraContext } from '@/contexts/CameraContext';
import Loader from '../Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

// Feature flag for Vision Camera
// Set EXPO_PUBLIC_USE_VISION_CAMERA=true in .env to enable
const USE_VISION_CAMERA = process.env.EXPO_PUBLIC_USE_VISION_CAMERA === 'true';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_ANIMATION_DURATION = 300;
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.3; // 30% of screen height

type CameraSheetProps = {
  isVisible: boolean;
  onClose: () => void;
};

const CameraSheet = ({ isVisible, onClose }: CameraSheetProps) => {
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

  useEffect(() => {
    if (isVisible) {
      // Reset all state when opening
      setIsLoadingPermissions(false);
      setShouldShowScanner(false);
      animationStarted.value = 0;

      // Pre-request permissions first
      requestPermissionsIfNeeded();
    } else {
      // Clean up everything immediately when closing
      setShouldShowScanner(false);
      setIsLoadingPermissions(false);
      setScannerKey(prev => prev + 1);
      animationStarted.value = 0;

      // Don't animate on close, just reset values
      translateY.value = SCREEN_HEIGHT;
    }
  }, [isVisible]);

  // Start animation only when Scanner is ready to show
  useEffect(() => {
    if (shouldShowScanner && animationStarted.value === 0) {
      animationStarted.value = 1;

      // Now start the animation - Scanner is ready
      translateY.value = withTiming(0, {
        duration: SHEET_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic)
      });
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

  const pan = Gesture.Pan()
    .onBegin(() => {
      // Store the initial position when gesture begins
    })
    .onUpdate((event) => {
      // Only allow downward movement
      const newY = Math.max(0, event.translationY);
      translateY.value = newY;
      // Backdrop opacity is now automatically calculated from translateY in the animated style
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_THRESHOLD ||
        event.velocityY > 1000; // Fast swipe down

      if (shouldDismiss) {
        runOnJS(handleClose)();
      } else {
        // Snap back to open position - backdrop will follow automatically
        translateY.value = withTiming(0, {
          duration: SHEET_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic)
        });
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    // Only show backdrop after animation has started
    if (animationStarted.value === 0) {
      return { opacity: 0 };
    }

    // Make backdrop opacity tied to sheet position for perfect sync
    const opacity = interpolate(
      translateY.value,
      [SCREEN_HEIGHT, 0],
      [0, 0.4],
      Extrapolate.CLAMP
    );

    return {
      opacity: opacity,
    };
  });

  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

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
      {/* Backdrop */}
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
      >
        <SquishyPressable
          style={{ flex: 1 }}
          onPress={handleClose}
        >
          <View style={{ flex: 1 }} />
        </SquishyPressable>
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
              backgroundColor: 'black',
              zIndex: 1002,
            },
            sheetAnimatedStyle,
          ]}
        >
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            {/* Show loading state while permissions are being requested */}
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
                /* Controlled Scanner mounting for proper lifecycle */
                USE_VISION_CAMERA ? (
                  <VisionCameraScanner
                    key={`vision-scanner-${scannerKey}`}
                    onClose={handleClose}
                    onImageScanned={() => {
                      // Keep sheet open during image processing
                    }}
                  />
                ) : (
                  <Scanner
                    key={`scanner-${scannerKey}`}
                    onClose={handleClose}
                    onImageScanned={() => {
                      // Keep sheet open during image processing
                    }}
                  />
                )
              ) : (
                /* Black placeholder while not ready */
                <View style={{
                  flex: 1,
                  backgroundColor: 'black'
                }} />
              )}
          </View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default CameraSheet;