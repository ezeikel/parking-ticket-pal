import { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';

type DocumentOverlayProps = {
  corners: DocumentCorner[] | null;
  confidence: number; // 0-1
  stabilityProgress?: number; // 0-1 progress towards auto-capture
  autoCaptureEnabled?: boolean;
};

/**
 * UI overlay component for document detection feedback
 *
 * Note: Document polygon is now drawn directly on camera frame using Skia.
 * This component only shows UI elements (text hints, animations, debug info).
 *
 * Features:
 * - Displays capture hint text based on detection quality
 * - Pulse animation when ready to capture
 * - Color-coded backgrounds for visual feedback
 * - Debug confidence display (dev mode only)
 *
 * Color scheme:
 * - Green (confidence > 0.7): Document well-detected, ready to capture
 * - Yellow (confidence 0.4-0.7): Document detected but needs better positioning
 * - Red (confidence < 0.4): Document detected but poor quality
 */
const DocumentOverlay = ({
  corners,
  confidence,
  stabilityProgress = 0,
  autoCaptureEnabled = false,
}: DocumentOverlayProps) => {
  const opacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Animate overlay appearance
  useEffect(() => {
    if (corners) {
      opacity.value = withTiming(1, { duration: 300 });

      // Pulse animation for high confidence (ready to capture)
      if (confidence > 0.7) {
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
          ),
          -1, // Infinite repeat
          false
        );
      } else {
        pulseScale.value = withTiming(1, { duration: 300 });
      }
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      pulseScale.value = 1;
    }
  }, [corners, confidence]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  // No corners detected - show nothing (removed static guides)
  if (!corners || corners.length !== 4) {
    return null;
  }

  // Determine overlay color based on confidence
  const getColor = (): string => {
    if (confidence > 0.7) return '#00FF00'; // Green - excellent
    if (confidence > 0.4) return '#FFD700'; // Yellow - good
    return '#FF4444'; // Red - poor
  };

  // Get hint text based on confidence and auto-capture state
  const getHintText = (): string => {
    if (autoCaptureEnabled && confidence >= 0.75 && stabilityProgress > 0) {
      if (stabilityProgress >= 1) {
        return 'Capturing...';
      }
      const percentage = Math.floor(stabilityProgress * 100);
      return `Hold steady... ${percentage}%`;
    }
    if (confidence > 0.7) return autoCaptureEnabled ? 'Hold steady for auto-capture' : 'Tap to capture';
    if (confidence > 0.4) return 'Hold steady';
    return 'Align document';
  };

  const color = getColor();
  const hintText = getHintText();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.overlay, animatedStyle]}>
        {/* Hint text at top */}
        <View style={styles.hintContainer}>
          <View
            style={[
              styles.hintTextBackground,
              { backgroundColor: color === '#00FF00' ? '#00FF00' : color === '#FFD700' ? '#FFD700' : '#FF4444' },
            ]}
          >
            <Text style={styles.hintText}>{hintText}</Text>
            {/* Stability progress bar for auto-capture */}
            {autoCaptureEnabled && confidence >= 0.75 && stabilityProgress > 0 && stabilityProgress < 1 && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${stabilityProgress * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Confidence indicator at bottom (debug/development) */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <View style={styles.debugTextBackground}>
              <Text style={styles.debugText}>
                Confidence: {(confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  hintContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintTextBackground: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    opacity: 0.9,
  },
  hintText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Inter18pt-Bold',
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  debugTextBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter18pt-Regular',
  },
  progressBarContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});

export default DocumentOverlay;
