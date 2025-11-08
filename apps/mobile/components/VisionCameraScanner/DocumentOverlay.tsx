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
import Svg, { Polygon, Circle } from 'react-native-svg';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';

type DocumentOverlayProps = {
  corners: DocumentCorner[] | null;
  confidence: number; // 0-1
  frameWidth: number;
  frameHeight: number;
};

/**
 * Visual overlay component for document detection feedback
 *
 * Features:
 * - Draws detected document rectangle with confidence-based coloring
 * - Shows corner dots for precise positioning feedback
 * - Displays capture hint text based on detection quality
 * - Smooth color transitions as confidence changes
 *
 * Color scheme:
 * - Green (confidence > 0.7): Document well-detected, ready to capture
 * - Yellow (confidence 0.4-0.7): Document detected but needs better positioning
 * - Red (confidence < 0.4): Document detected but poor quality
 */
const DocumentOverlay = ({
  corners,
  confidence,
  frameWidth,
  frameHeight,
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

  // Get hint text based on confidence
  const getHintText = (): string => {
    if (confidence > 0.7) return 'Tap to capture';
    if (confidence > 0.4) return 'Hold steady';
    return 'Align document';
  };

  const color = getColor();
  const hintText = getHintText();

  // Convert corners array to SVG polygon points string
  // Format: "x1,y1 x2,y2 x3,y3 x4,y4"
  const polygonPoints = corners
    .map((corner) => `${corner.x},${corner.y}`)
    .join(' ');

  return (
    <View style={[styles.container, { width: frameWidth, height: frameHeight }]} pointerEvents="none">
      <Animated.View style={[styles.overlay, animatedStyle]}>
        <Svg width={frameWidth} height={frameHeight} style={styles.svg}>
          {/* Document rectangle */}
          <Polygon
            points={polygonPoints}
            fill="transparent"
            stroke={color}
            strokeWidth={3}
            strokeOpacity={0.9}
          />

          {/* Corner dots for precise feedback */}
          {corners.map((corner, index) => (
            <Circle
              key={`corner-${index}`}
              cx={corner.x}
              cy={corner.y}
              r={8}
              fill={color}
              opacity={0.9}
            />
          ))}
        </Svg>

        {/* Hint text at top */}
        <View style={styles.hintContainer}>
          <View
            style={[
              styles.hintTextBackground,
              { backgroundColor: color === '#00FF00' ? '#00FF00' : color === '#FFD700' ? '#FFD700' : '#FF4444' },
            ]}
          >
            <Text style={styles.hintText}>{hintText}</Text>
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
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    flex: 1,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
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
});

export default DocumentOverlay;
