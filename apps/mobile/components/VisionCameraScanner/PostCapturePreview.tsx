import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateLeft, faCheck } from '@fortawesome/pro-regular-svg-icons';
import Svg, { Polygon } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import Loader from '@/components/Loader/Loader';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';

const CORNER_DOT_SIZE = 28;
const CORNER_HIT_PAD = 16; // extra invisible hit area around the visible dot

type PostCapturePreviewProps = {
  imageUri: string;
  detectedCorners: DocumentCorner[] | null;
  onAccept: () => void;
  onRetake: () => void;
  isProcessing?: boolean;
};

const PostCapturePreview = ({
  imageUri,
  detectedCorners,
  onAccept,
  onRetake,
  isProcessing = false,
}: PostCapturePreviewProps) => {
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  // Editable copy of the corners. Initial value comes from detection; the user
  // can drag any of the four dots to nudge the polygon. Stored normalized
  // [0..1] just like detectedCorners so the SVG / handoff code stays simple.
  const [editableCorners, setEditableCorners] = useState<DocumentCorner[] | null>(null);

  useEffect(() => {
    if (detectedCorners && detectedCorners.length === 4) {
      setEditableCorners(detectedCorners);
    } else if (imageLayout.width > 0 && !editableCorners) {
      // No detection — drop default corners with a margin so the user can still
      // adjust manually. Normalized space, so just use fixed insets.
      setEditableCorners([
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedCorners, imageLayout.width]);

  const handleImageLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    setImageLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  }, []);

  // Build SVG polygon points from current editable corners
  const polygonPoints = editableCorners && imageLayout.width > 0
    ? editableCorners
        .map(c => `${c.x * imageLayout.width},${c.y * imageLayout.height}`)
        .join(' ')
    : null;

  // Per-corner drag handler. Updates the normalized corner at `index`.
  const handleCornerDrag = useCallback((index: number, normX: number, normY: number) => {
    setEditableCorners((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      // Clamp to [0..1] so dots can't be dragged outside the image bounds.
      next[index] = {
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
      };
      return next;
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={styles.container}>
        {/* Image preview with corner overlay */}
        <View style={styles.imageContainer} onLayout={handleImageLayout}>
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
          {polygonPoints && imageLayout.width > 0 && (
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <Polygon
                points={polygonPoints}
                fill="rgba(76, 175, 80, 0.15)"
                stroke="rgba(76, 175, 80, 0.9)"
                strokeWidth={2}
              />
            </Svg>
          )}
          {/* Draggable corner handles — rendered after the SVG so they sit on top */}
          {editableCorners && imageLayout.width > 0 && !isProcessing && editableCorners.map((c, i) => (
            <CornerHandle
              key={i}
              index={i}
              corner={c}
              containerWidth={imageLayout.width}
              containerHeight={imageLayout.height}
              onDrag={handleCornerDrag}
            />
          ))}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <Loader size={48} color="white" />
              <Text style={styles.processingText}>Processing with AI...</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* flex:1 must live on the SquishyPressable itself so each button takes
              half the row. Putting it only on the inner View leaves the Pressable
              at intrinsic width and the buttons collapse — same bug fixed for
              Scanner in 5d7dc4f. */}
          <SquishyPressable onPress={onRetake} disabled={isProcessing} style={styles.buttonWrap}>
            <View style={styles.retakeButton}>
              <FontAwesomeIcon icon={faRotateLeft} size={20} color="#fff" />
              <Text style={styles.retakeText}>Retake</Text>
            </View>
          </SquishyPressable>

          <SquishyPressable onPress={onAccept} disabled={isProcessing} style={styles.buttonWrap}>
            <View style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}>
              {isProcessing ? (
                <Loader size={20} color="white" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} size={20} color="white" />
                  <Text style={styles.acceptText}>Process</Text>
                </>
              )}
            </View>
          </SquishyPressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

// CornerHandle — a single draggable dot for adjusting one corner of the
// detected document polygon. Position is driven by the parent's normalized
// `corner` prop; during drag the dot follows the finger via Reanimated shared
// values and reports the new normalized position back via onDrag.
type CornerHandleProps = {
  index: number;
  corner: DocumentCorner;
  containerWidth: number;
  containerHeight: number;
  onDrag: (index: number, normX: number, normY: number) => void;
};

const CornerHandle = ({
  index,
  corner,
  containerWidth,
  containerHeight,
  onDrag,
}: CornerHandleProps) => {
  // Absolute pixel position of the dot. Drives Animated.View's transform.
  const px = useSharedValue(corner.x * containerWidth);
  const py = useSharedValue(corner.y * containerHeight);
  // Where the finger started, captured at gesture begin so each drag is
  // relative to where the dot was, not where the finger landed.
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Keep px/py in sync when parent updates the corner (e.g. after a Retake
  // → new detection, or when another dot pushes this one via clamp logic).
  useEffect(() => {
    px.value = corner.x * containerWidth;
    py.value = corner.y * containerHeight;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corner.x, corner.y, containerWidth, containerHeight]);

  const reportDrag = useCallback(
    (newX: number, newY: number) => {
      onDrag(index, newX / containerWidth, newY / containerHeight);
    },
    [index, onDrag, containerWidth, containerHeight],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startX.value = px.value;
          startY.value = py.value;
        })
        .onUpdate((e) => {
          const next = Math.max(0, Math.min(containerWidth, startX.value + e.translationX));
          const nextY = Math.max(0, Math.min(containerHeight, startY.value + e.translationY));
          px.value = next;
          py.value = nextY;
          // Stream updates back to React state so the SVG polygon follows the
          // finger in real time, not just at gesture end.
          runOnJS(reportDrag)(next, nextY);
        }),
    [containerWidth, containerHeight, reportDrag, px, py, startX, startY],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: px.value - CORNER_DOT_SIZE / 2 - CORNER_HIT_PAD },
      { translateY: py.value - CORNER_DOT_SIZE / 2 - CORNER_HIT_PAD },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cornerHit, animatedStyle]}>
        <View style={styles.cornerDot} />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  imageContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  processingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  buttonWrap: {
    flex: 1,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  retakeText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#1ABC9C',
    borderRadius: 8,
  },
  acceptText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Corner handle styles. cornerHit is an oversized invisible tap target;
  // cornerDot is the small visible circle centered inside it.
  cornerHit: {
    position: 'absolute',
    width: CORNER_DOT_SIZE + CORNER_HIT_PAD * 2,
    height: CORNER_DOT_SIZE + CORNER_HIT_PAD * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerDot: {
    width: CORNER_DOT_SIZE,
    height: CORNER_DOT_SIZE,
    borderRadius: CORNER_DOT_SIZE / 2,
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    borderWidth: 3,
    borderColor: '#fff',
  },
});

export default PostCapturePreview;
