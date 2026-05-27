import { useEffect } from 'react';
import { StyleSheet, View, Text, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Path, Circle, Group } from '@shopify/react-native-skia';
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
import Loader from '@/components/Loader/Loader';

// Layout constants — kept in sync with CameraControls so overlay elements
// can position themselves relative to the same safe-area math.
//   CameraControls top button row sits at `max(insets.top, 20) + 10`
//   and is `48pt` tall (iconButtonInner). The chip stack lives below it.
const TOP_CONTROL_HEIGHT = 48;
const TOP_CONTROL_PADDING_BASE = 10;
const CHIP_STACK_GAP_BELOW_CONTROLS = 12;
const HINT_FROM_TOP_BASE = 30;

type DocumentOverlayProps = {
  cornersNormalized: SharedValue<DocumentCorner[] | null>;
  confidenceValue: SharedValue<number>;
  isDetected: SharedValue<boolean>;
  // Rotated-frame aspect ratio (width/height) — lets us mirror the <Camera resizeMode>
  // projection when drawing normalized corners onto the on-screen canvas.
  frameAspectRatio: SharedValue<number>;
  stabilityProgress: number;
  autoCaptureEnabled: boolean;
  // Live on-device OCR results, surfaced as floating chips next to the polygon
  // so the user can see what the camera is reading before they capture.
  livePcn?: string;
  liveVrm?: string;
  liveIssuer?: string;
  liveOCRRecognizing?: boolean;
};

const CORNER_RADIUS = 8;

const DocumentOverlay = ({
  cornersNormalized,
  confidenceValue,
  isDetected,
  frameAspectRatio,
  stabilityProgress,
  autoCaptureEnabled,
  livePcn,
  liveVrm,
  liveIssuer,
  liveOCRRecognizing = false,
}: DocumentOverlayProps) => {
  const insets = useSafeAreaInsets();
  // Top of the camera control button row — kept in sync with the math in
  // CameraControls.tsx so anything that needs to sit below the controls can
  // compute its own offset from a single source of truth.
  const topControlsTop = Math.max(insets.top, 20) + TOP_CONTROL_PADDING_BASE;
  // Chip stack: directly below the control row with a small gap so it never
  // overlaps the close / auto-capture buttons or the dynamic island.
  const chipStackTop = topControlsTop + TOP_CONTROL_HEIGHT + CHIP_STACK_GAP_BELOW_CONTROLS;
  // Hint badge: sits in the upper-middle area, low enough to clear the
  // dynamic island on tall phones without colliding with the chip stack.
  const hintContainerTop = topControlsTop + TOP_CONTROL_HEIGHT + HINT_FROM_TOP_BASE;

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

  // Project a normalized (rotated-frame) corner [0..1] onto the on-screen
  // canvas, mirroring <Camera resizeMode="cover">: scale so the SHORTER axis
  // fills the canvas and the longer axis overflows (gets cropped). Opposite
  // of "contain". Inline because it has to run inside the useDerivedValue
  // worklet (no closures over JS-side helpers).
  //
  // Math: pick the scale factor that fills the canvas on the limiting axis.
  // If the frame is wider than the canvas (relative to height), height fills
  // and width overflows symmetrically off both sides. A corner at normalized
  // (c.x, c.y) ∈ [0,1] maps onto the displayed area shifted by the overflow.
  const projectCorner = (c: DocumentCorner, w: number, h: number, fAspect: number) => {
    'worklet';
    if (fAspect <= 0) return { x: c.x * w, y: c.y * h };
    const canvasAspect = w / h;
    if (fAspect > canvasAspect) {
      // Frame is wider than canvas → height fills, width overflows both sides.
      // Displayed frame width = h * fAspect, which is > w.
      const displayedW = h * fAspect;
      const overflowX = (displayedW - w) / 2;
      const x = c.x * displayedW - overflowX;
      const y = c.y * h;
      return { x, y };
    }
    // Frame is taller than canvas → width fills, height overflows top + bottom.
    const displayedH = w / fAspect;
    const overflowY = (displayedH - h) / 2;
    const x = c.x * w;
    const y = c.y * displayedH - overflowY;
    return { x, y };
  };

  // Build path from normalized corners
  const documentPath = useDerivedValue(() => {
    const corners = cornersNormalized.value;
    const w = canvasWidth.value;
    const h = canvasHeight.value;
    const fAspect = frameAspectRatio.value;

    if (!corners || corners.length !== 4 || w === 0 || h === 0) {
      return Skia.Path.Make();
    }

    const p0 = projectCorner(corners[0], w, h, fAspect);
    const p1 = projectCorner(corners[1], w, h, fAspect);
    const p2 = projectCorner(corners[2], w, h, fAspect);
    const p3 = projectCorner(corners[3], w, h, fAspect);
    const path = Skia.Path.Make();
    path.moveTo(p0.x, p0.y);
    path.lineTo(p1.x, p1.y);
    path.lineTo(p2.x, p2.y);
    path.lineTo(p3.x, p3.y);
    path.close();
    return path;
  });

  // Corner positions in screen coordinates
  const cornerScreenPositions = useDerivedValue(() => {
    const corners = cornersNormalized.value;
    const w = canvasWidth.value;
    const h = canvasHeight.value;
    const fAspect = frameAspectRatio.value;

    if (!corners || corners.length !== 4 || w === 0 || h === 0) {
      return null;
    }

    return corners.map((c: DocumentCorner) => projectCorner(c, w, h, fAspect));
  });

  // Stroke paint — green when detected, orange otherwise.
  // 0.65 threshold accounts for EMA smoothing on raw 0.7 confidence asymptoting
  // toward but never reaching 0.7. 1.0 = perfect, 0.7 = acceptable, 0.6 = far/close.
  const strokeColor = useDerivedValue(() => {
    const conf = confidenceValue.value;
    if (conf >= 0.65) return Skia.Color('rgba(76, 175, 80, 0.9)');
    if (conf >= 0.4) return Skia.Color('rgba(255, 152, 0, 0.9)');
    return Skia.Color('rgba(244, 67, 54, 0.9)');
  });

  const fillColor = useDerivedValue(() => {
    const conf = confidenceValue.value;
    if (conf >= 0.65) return Skia.Color('rgba(76, 175, 80, 0.15)');
    if (conf >= 0.4) return Skia.Color('rgba(255, 152, 0, 0.15)');
    return Skia.Color('rgba(244, 67, 54, 0.15)');
  });

  const cornerColor = useDerivedValue(() => {
    const conf = confidenceValue.value;
    if (conf >= 0.65) return Skia.Color('rgba(76, 175, 80, 1)');
    if (conf >= 0.4) return Skia.Color('rgba(255, 152, 0, 1)');
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

  const hasAnyOCR = Boolean(livePcn || liveVrm || liveIssuer);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Filled polygon */}
        <Path path={documentPath} color={fillColor} style="fill" />
        {/* Stroke border */}
        <Path path={documentPath} color={strokeColor} style="stroke" strokeWidth={3} />
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
        <View style={[styles.hintContainer, { top: hintContainerTop }]}>
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

      {/* Live OCR chip stack — fixed top-right of screen, independent of polygon.
       *  Each line is independent: if we have REG but no PCN yet and OCR is
       *  still running, the PCN row shows a spinner instead of hiding. Once
       *  OCR finishes (isRecognizing=false), missing fields stay hidden — we
       *  tried, didn't find them. */}
      {(hasAnyOCR || liveOCRRecognizing) && (
        <View style={[styles.chipStack, { top: chipStackTop }]} pointerEvents="none">
          {(livePcn || liveOCRRecognizing) && (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>PCN</Text>
              {livePcn ? (
                <Text style={styles.chipValue}>{livePcn}</Text>
              ) : (
                <Loader size={12} color="#fff" />
              )}
            </View>
          )}
          {(liveVrm || liveOCRRecognizing) && (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Reg</Text>
              {liveVrm ? (
                <Text style={styles.chipValue}>{liveVrm}</Text>
              ) : (
                <Loader size={12} color="#fff" />
              )}
            </View>
          )}
          {(liveIssuer || liveOCRRecognizing) && (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Issuer</Text>
              {liveIssuer ? (
                <Text style={styles.chipValue} numberOfLines={1}>{liveIssuer}</Text>
              ) : (
                <Loader size={12} color="#fff" />
              )}
            </View>
          )}
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
    // `top` is set inline at render time so it can react to safe-area insets
    // (dynamic island, status bar) instead of hard-coding pixels.
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
  chipStack: {
    position: 'absolute',
    // `top` is set inline at render time, computed from safe-area insets +
    // the height of the CameraControls top row, so the chips always sit
    // just below the close / auto-capture buttons regardless of device.
    right: 16,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 240,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  chipLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontFamily: 'Inter18pt-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipValue: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter18pt-Bold',
  },
});

export default DocumentOverlay;
