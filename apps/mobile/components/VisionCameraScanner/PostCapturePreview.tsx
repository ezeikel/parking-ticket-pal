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
import DocumentDetector from '@/modules/document-detector';

const CORNER_DOT_SIZE = 28;
const CORNER_HIT_PAD = 16; // extra invisible hit area around the visible dot

type PostCapturePreviewProps = {
  imageUri: string;
  detectedCorners: DocumentCorner[] | null;
  onAccept: () => void;
  onRetake: () => void;
  isProcessing?: boolean;
  // Live OCR fields carried over from the camera screen. We display them as
  // chips so the user can sanity-check what the ML Kit pass extracted before
  // committing to the heavier server-side OpenAI Vision call (which runs when
  // they tap Process).
  livePcn?: string;
  liveVrm?: string;
  liveIssuer?: string;
};

const PostCapturePreview = ({
  imageUri,
  detectedCorners,
  onAccept,
  onRetake,
  isProcessing = false,
  livePcn,
  liveVrm,
  liveIssuer,
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

  // SPIKE: run Apple Vision document segmentation on the captured still and
  // keep its quad so we can draw it alongside the OpenCV/Otsu quad for a
  // visual A/B on real photos. `visionCorners` are in image-normalized [0,1]
  // space (NOT container space) so projection has to account for the
  // contain-letterbox. `visionImageAspect` = imageWidth / imageHeight.
  const [visionCorners, setVisionCorners] = useState<DocumentCorner[] | null>(null);
  const [visionImageAspect, setVisionImageAspect] = useState<number | null>(null);
  const [visionConfidence, setVisionConfidence] = useState<number | null>(null);
  const [visionRan, setVisionRan] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await DocumentDetector.detectDocument(imageUri);
        if (cancelled) return;
        setVisionRan(true);
        if (result && result.corners?.length === 4) {
          setVisionCorners(result.corners);
          setVisionImageAspect(result.imageWidth / result.imageHeight);
          setVisionConfidence(result.confidence);
        }
      } catch {
        if (!cancelled) setVisionRan(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  // Project Vision's image-normalized corners onto the displayed (contain-
  // letterboxed) image inside imageContainer. The image is centered with bars
  // on whichever axis is the limiting one.
  const visionPolygonPoints = useMemo(() => {
    if (
      !visionCorners ||
      visionImageAspect == null ||
      imageLayout.width === 0 ||
      imageLayout.height === 0
    ) {
      return null;
    }
    const containerAspect = imageLayout.width / imageLayout.height;
    let displayedW: number;
    let displayedH: number;
    if (visionImageAspect > containerAspect) {
      // Image wider than container → width fills, bars top/bottom.
      displayedW = imageLayout.width;
      displayedH = imageLayout.width / visionImageAspect;
    } else {
      // Image taller than container → height fills, bars left/right.
      displayedH = imageLayout.height;
      displayedW = imageLayout.height * visionImageAspect;
    }
    const offsetX = (imageLayout.width - displayedW) / 2;
    const offsetY = (imageLayout.height - displayedH) / 2;
    return visionCorners
      .map((c) => `${offsetX + c.x * displayedW},${offsetY + c.y * displayedH}`)
      .join(' ');
  }, [visionCorners, visionImageAspect, imageLayout]);

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
              {/* OpenCV / Otsu quad — green (existing) */}
              <Polygon
                points={polygonPoints}
                fill="rgba(76, 175, 80, 0.15)"
                stroke="rgba(76, 175, 80, 0.9)"
                strokeWidth={2}
              />
            </Svg>
          )}
          {/* SPIKE: Apple Vision quad — magenta, drawn on top for A/B compare */}
          {visionPolygonPoints && imageLayout.width > 0 && (
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <Polygon
                points={visionPolygonPoints}
                fill="rgba(233, 30, 99, 0.12)"
                stroke="rgba(233, 30, 99, 0.95)"
                strokeWidth={2}
              />
            </Svg>
          )}
          {/* SPIKE: tiny legend + Vision confidence readout */}
          {visionRan && (
            <View style={styles.spikeLegend} pointerEvents="none">
              <Text style={styles.spikeLegendText}>
                {'■'} green = OpenCV{'   '}
                {'■'} magenta = Vision
              </Text>
              <Text style={styles.spikeLegendText}>
                {visionCorners
                  ? `Vision conf: ${(visionConfidence ?? 0).toFixed(2)}`
                  : 'Vision: no document found'}
              </Text>
            </View>
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

          {/* Carry-over OCR chips from the live preview. Same look as the
              scanner overlay — gives the user one last "is this what I'm
              uploading?" check before tapping Process. */}
          {(livePcn || liveVrm || liveIssuer) && !isProcessing && (
            <View style={styles.chipStack} pointerEvents="none">
              {livePcn && (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>PCN</Text>
                  <Text style={styles.chipValue}>{livePcn}</Text>
                </View>
              )}
              {liveVrm && (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>Reg</Text>
                  <Text style={styles.chipValue}>{liveVrm}</Text>
                </View>
              )}
              {liveIssuer && (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>Issuer</Text>
                  <Text style={styles.chipValue} numberOfLines={1}>{liveIssuer}</Text>
                </View>
              )}
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
  // SPIKE-only styles for the OpenCV-vs-Vision comparison overlay.
  spikeLegend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  spikeLegendText: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
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
  // OCR chip stack — same look as DocumentOverlay's live chips, just
  // positioned at the top-right of the photo preview here.
  chipStack: {
    position: 'absolute',
    top: 16,
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

export default PostCapturePreview;
