import { useEffect } from 'react';
import { StyleSheet, View, Text, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Circle, Group, PaintStyle } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Skia } from '@shopify/react-native-skia';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';

type DocumentOverlayProps = {
  cornersNormalized: SharedValue<DocumentCorner[] | null>;
  confidenceValue: SharedValue<number>;
  isDetected: SharedValue<boolean>;
  stabilityProgress: number;
  autoCaptureEnabled: boolean;
};

const CORNER_RADIUS = 8;

const DocumentOverlay = ({
  cornersNormalized,
  confidenceValue,
  isDetected,
  stabilityProgress,
  autoCaptureEnabled,
}: DocumentOverlayProps) => {
  console.log('[scanner-diag] DocumentOverlay render', {
    hasCornersSV: !!cornersNormalized,
    cornersIsReanimated: (cornersNormalized as any)?._isReanimatedSharedValue,
    confidenceIsReanimated: (confidenceValue as any)?._isReanimatedSharedValue,
    isDetectedIsReanimated: (isDetected as any)?._isReanimatedSharedValue,
  });

  const canvasWidth = useSharedValue(0);
  const canvasHeight = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Pulse when ready to capture
  useEffect(() => {
    if (stabilityProgress > 0) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [stabilityProgress]);

  const handleLayout = (e: LayoutChangeEvent) => {
    canvasWidth.value = e.nativeEvent.layout.width;
    canvasHeight.value = e.nativeEvent.layout.height;
  };

  // Build path from normalized corners
  const documentPath = useDerivedValue(() => {
    const corners = cornersNormalized.value;
    const w = canvasWidth.value;
    const h = canvasHeight.value;

    if (!corners || corners.length !== 4 || w === 0 || h === 0) {
      return Skia.Path.Make();
    }

    const path = Skia.Path.Make();
    path.moveTo(corners[0].x * w, corners[0].y * h);
    path.lineTo(corners[1].x * w, corners[1].y * h);
    path.lineTo(corners[2].x * w, corners[2].y * h);
    path.lineTo(corners[3].x * w, corners[3].y * h);
    path.close();
    return path;
  });

  // Corner positions in screen coordinates
  const cornerScreenPositions = useDerivedValue(() => {
    const corners = cornersNormalized.value;
    const w = canvasWidth.value;
    const h = canvasHeight.value;

    if (!corners || corners.length !== 4 || w === 0 || h === 0) {
      return null;
    }

    return corners.map((c: DocumentCorner) => ({ x: c.x * w, y: c.y * h }));
  });

  // Stroke paint — green when detected, orange otherwise
  const strokeColor = useDerivedValue(() => {
    const conf = confidenceValue.value;
    if (conf > 0.7) return Skia.Color('rgba(76, 175, 80, 0.9)');
    if (conf > 0.4) return Skia.Color('rgba(255, 152, 0, 0.9)');
    return Skia.Color('rgba(244, 67, 54, 0.9)');
  });

  const fillColor = useDerivedValue(() => {
    const conf = confidenceValue.value;
    if (conf > 0.7) return Skia.Color('rgba(76, 175, 80, 0.15)');
    if (conf > 0.4) return Skia.Color('rgba(255, 152, 0, 0.15)');
    return Skia.Color('rgba(244, 67, 54, 0.15)');
  });

  const cornerColor = useDerivedValue(() => {
    const conf = confidenceValue.value;
    if (conf > 0.7) return Skia.Color('rgba(76, 175, 80, 1)');
    if (conf > 0.4) return Skia.Color('rgba(255, 152, 0, 1)');
    return Skia.Color('rgba(244, 67, 54, 1)');
  });

  // Hint text
  const getHintText = (): string | null => {
    if (autoCaptureEnabled && stabilityProgress >= 1) return 'Capturing...';
    if (autoCaptureEnabled && stabilityProgress > 0) {
      return `Hold steady... ${Math.floor(stabilityProgress * 100)}%`;
    }
    // These are driven by React state (stabilityProgress) not shared values,
    // so we can't read isDetected here. The hint renders based on stabilityProgress only.
    return null;
  };

  const hintText = getHintText();

  // Hint styles
  const hintAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const strokePaint = useDerivedValue(() => {
    const paint = Skia.Paint();
    paint.setColor(strokeColor.value);
    paint.setStrokeWidth(3);
    paint.setStyle(PaintStyle.Stroke);
    return paint;
  });

  const fillPaint = useDerivedValue(() => {
    const paint = Skia.Paint();
    paint.setColor(fillColor.value);
    paint.setStyle(PaintStyle.Fill);
    return paint;
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Filled polygon */}
        <Path path={documentPath} paint={fillPaint} />
        {/* Stroke border */}
        <Path path={documentPath} paint={strokePaint} />
        {/* Corner circles */}
        <Group>
          {[0, 1, 2, 3].map(idx => (
            <CornerDot
              key={idx}
              index={idx}
              positions={cornerScreenPositions}
              color={cornerColor}
            />
          ))}
        </Group>
      </Canvas>

      {/* Hint text overlay */}
      {hintText && (
        <View style={styles.hintContainer}>
          <Animated.View
            style={[
              styles.hintBadge,
              stabilityProgress > 0 ? styles.hintBadgeGreen : styles.hintBadgeOrange,
              hintAnimatedStyle,
            ]}
          >
            <Text style={styles.hintText}>{hintText}</Text>
            {autoCaptureEnabled && stabilityProgress > 0 && stabilityProgress < 1 && (
              <View style={styles.progressBar}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${stabilityProgress * 100}%` }]} />
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
};

type CornerDotProps = {
  index: number;
  positions: any;
  color: any;
};

const CornerDot = ({ index, positions, color }: CornerDotProps) => {
  const cx = useDerivedValue(() => {
    const pos = positions.value;
    return pos ? pos[index].x : -100;
  });

  const cy = useDerivedValue(() => {
    const pos = positions.value;
    return pos ? pos[index].y : -100;
  });

  return <Circle cx={cx} cy={cy} r={CORNER_RADIUS} color={color} />;
};

const styles = StyleSheet.create({
  hintContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  hintBadgeGreen: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  hintBadgeOrange: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  hintText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter18pt-Bold',
    textAlign: 'center',
  },
  progressBar: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});

export default DocumentOverlay;
