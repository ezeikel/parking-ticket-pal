import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
import { useSharedValue as useReanimatedSharedValue } from 'react-native-reanimated';
import {
  OpenCV,
  ObjectType,
  ColorConversionCodes,
  MorphShapes,
  MorphTypes,
  RetrievalModes,
  ContourApproximationModes,
  BorderTypes,
  ThresholdTypes,
} from 'react-native-fast-opencv';

export type DocumentCorner = {
  x: number;
  y: number;
};

export type DocumentDetectionCallbacks = {
  onDetectionUpdate?: (
    corners: DocumentCorner[] | null,
    confidence: number,
    frameAspectRatio: number,
  ) => void;
  onAutoCapture?: () => void;
  onStabilityUpdate?: (stabilityProgress: number) => void;
};

enum DetectionState {
  NO_DOCUMENT = 'no_document',
  DOCUMENT_DETECTED = 'document_detected',
}

// --- Worklet helpers ---

const validateRectangularShape = (points: DocumentCorner[]): boolean => {
  'worklet';
  if (points.length !== 4) return false;

  const distances: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % 4];
    distances.push(Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2));
  }

  const sorted = [...distances].sort((a, b) => a - b);
  const shortSide = (sorted[0] + sorted[1]) / 2;
  const longSide = (sorted[2] + sorted[3]) / 2;
  const aspectRatio = longSide / shortSide;
  // We're scanning UK parking docs: A4 letters and NTO receipts. Floor at 1.10
  // covers near-square views (e.g. A4 captured slightly tilted will compress
  // toward squarer in the projected quad). Ceiling at 6.50 covers long narrow
  // receipts. The previous 1.20 floor was rejecting real letters at angles.
  if (aspectRatio < 1.10 || aspectRatio > 6.50) return false;

  // Opposite-side length similarity. Loosened from 0.45 → 0.6 so a tilted /
  // perspective-distorted A4 letter (where opposite sides foreshorten by
  // different amounts) still passes. We have other defences (edge-touching,
  // area cap) so we don't need this to be strict.
  const side1Diff = Math.abs(distances[0] - distances[2]) / Math.max(distances[0], distances[2]);
  const side2Diff = Math.abs(distances[1] - distances[3]) / Math.max(distances[1], distances[3]);
  if (side1Diff > 0.6 || side2Diff > 0.6) return false;

  // Corner-angle plausibility. Loosened from [45°, 135°] → [30°, 150°] so
  // strongly tilted documents still pass.
  for (let i = 0; i < 4; i++) {
    const p1 = points[(i - 1 + 4) % 4];
    const p2 = points[i];
    const p3 = points[(i + 1) % 4];
    const v1x = p1.x - p2.x, v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x, v2y = p3.y - p2.y;
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    if (angle < 30 || angle > 150) return false;
  }

  return true;
};

const areCornersSimular = (
  newCorners: DocumentCorner[],
  existingCorners: DocumentCorner[],
  maxMovementRatio: number,
): boolean => {
  'worklet';
  if (newCorners.length !== 4 || existingCorners.length !== 4) return false;

  const xs = existingCorners.map(c => c.x);
  const ys = existingCorners.map(c => c.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const docSize = Math.sqrt(w * w + h * h);

  let total = 0;
  for (let i = 0; i < 4; i++) {
    const dx = newCorners[i].x - existingCorners[i].x;
    const dy = newCorners[i].y - existingCorners[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total / 4 <= docSize * maxMovementRatio;
};

const smoothCorners = (
  newCorners: DocumentCorner[],
  prev: DocumentCorner[] | null,
  alpha: number,
): DocumentCorner[] => {
  'worklet';
  if (!prev || prev.length !== 4) return newCorners;
  return newCorners.map((c, i) => ({
    x: alpha * c.x + (1 - alpha) * prev[i].x,
    y: alpha * c.y + (1 - alpha) * prev[i].y,
  }));
};

// --- Main hook ---

export const useDocumentDetection = (callbacks?: DocumentDetectionCallbacks) => {
  const { resize } = useResizePlugin();

  const onDetectionUpdateJS = callbacks?.onDetectionUpdate
    ? Worklets.createRunOnJS(callbacks.onDetectionUpdate)
    : null;
  const onAutoCaptureJS = callbacks?.onAutoCapture
    ? Worklets.createRunOnJS(callbacks.onAutoCapture)
    : null;
  const onStabilityUpdateJS = callbacks?.onStabilityUpdate
    ? Worklets.createRunOnJS(callbacks.onStabilityUpdate)
    : null;


  // Shared values for overlay (read by Skia Canvas on UI thread).
  // Reanimated SVs: their underlying _value lives in C++ shared memory and is addressable
  // from the VisionCamera/worklets-core frame processor runtime, so we can write to them
  // directly inside the worklet. useDerivedValue in DocumentOverlay subscribes to these
  // correctly because they carry _isReanimatedSharedValue.
  const cornersNormalized = useReanimatedSharedValue<DocumentCorner[] | null>(null);
  const confidenceValue = useReanimatedSharedValue<number>(0);
  const isDetected = useReanimatedSharedValue<boolean>(false);
  // Rotated frame aspect ratio (width / height as displayed). DocumentOverlay
  // uses this to undo the cover-fit cropping that <Camera resizeMode="cover">
  // does between the camera buffer and the on-screen preview.
  const frameAspectRatio = useReanimatedSharedValue<number>(0);

  // Internal state (frame processor worklet only)
  const smoothedCorners = useSharedValue<DocumentCorner[] | null>(null);
  const smoothedConfidence = useSharedValue<number>(0);
  const detectionState = useSharedValue<DetectionState>(DetectionState.NO_DOCUMENT);
  const stableFrameCount = useSharedValue<number>(0);
  const postExitGraceCounter = useSharedValue<number>(0);
  const cornerPersistenceCounter = useSharedValue<number>(0);
  const detectionVotes = useSharedValue<boolean[]>([]);
  const frameCount = useSharedValue<number>(0);

  // Auto-capture state
  const stabilityCounter = useSharedValue<number>(0);
  const lastStableCorners = useSharedValue<DocumentCorner[] | null>(null);
  const autoCaptureTriggered = useSharedValue<boolean>(false);
  const autoCaptureEnabled = useSharedValue<boolean>(true);
  const autoCaptureResetFrameCount = useSharedValue<number>(0);

  // Constants
  const SCALE_FACTOR = 4;
  const CORNER_SMOOTHING = 0.3;
  const CORNER_PERSISTENCE_FRAMES = 3;
  const VOTE_HISTORY_SIZE = 5;
  const VOTE_THRESHOLD = 3;
  const CONFIDENCE_SMOOTHING = 0.5;
  const ENTER_THRESHOLD = 0.6;
  const EXIT_THRESHOLD = 0.3;
  const MIN_STABLE_FRAMES = 2;
  const POST_EXIT_GRACE_FRAMES = 1;
  const AUTO_CAPTURE_CONFIDENCE_THRESHOLD = 0.75;
  const AUTO_CAPTURE_STABILITY_FRAMES = 8;
  const AUTO_CAPTURE_MOVEMENT_THRESHOLD = 0.03;
  const AUTOCAPTURE_RESET_FRAMES = 60;

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    frameCount.value += 1;

    // Auto-capture reset countdown
    if (autoCaptureResetFrameCount.value > 0) {
      autoCaptureResetFrameCount.value -= 1;
      if (autoCaptureResetFrameCount.value === 0) {
        autoCaptureTriggered.value = false;
      }
    }

    // FPS limiting: process detection every 2nd frame (~15 FPS at 30 FPS camera)
    const shouldProcess = (frameCount.value - 1) % 2 === 0;
    if (!shouldProcess) return;

    let bestContour: DocumentCorner[] | null = null;
    let detectionConfidence = 0;

    try {
      const scaledWidth = Math.floor(frame.width / SCALE_FACTOR);
      const scaledHeight = Math.floor(frame.height / SCALE_FACTOR);
      if (scaledWidth <= 0 || scaledHeight <= 0) return;

      // Resize frame to 1/4 resolution
      const resizedBuffer = resize(frame, {
        scale: { width: scaledWidth, height: scaledHeight },
        pixelFormat: 'bgr',
        dataType: 'uint8',
      });
      if (!resizedBuffer || resizedBuffer.length === 0) return;

      const expectedSize = scaledWidth * scaledHeight * 3;
      if (resizedBuffer.length !== expectedSize) return;

      // OpenCV pipeline
      const source = OpenCV.bufferToMat('uint8', scaledHeight, scaledWidth, 3, resizedBuffer);
      if (!source) return;

      // Grayscale
      OpenCV.invoke('cvtColor', source, source, ColorConversionCodes.COLOR_BGR2GRAY);

      // Gaussian blur to smooth out small text and printing artefacts before
      // thresholding — keeps the document/background split clean.
      const blurKernel = OpenCV.createObject(ObjectType.Size, 5, 5);
      OpenCV.invoke('GaussianBlur', source, source, blurKernel, 0);

      // Otsu thresholding: cleanly separates light document from darker background
      // regardless of internal text noise. Much more reliable than Canny for
      // text-heavy documents where edge continuity is broken by lines of text.
      // THRESH_BINARY | THRESH_OTSU = 0 | 8 = 8. The 'thresh' param is ignored
      // for Otsu — it auto-selects the optimal threshold.
      OpenCV.invoke(
        'threshold',
        source,
        source,
        0,
        255,
        (ThresholdTypes.THRESH_BINARY | ThresholdTypes.THRESH_OTSU) as ThresholdTypes,
      );

      // Aggressive morphological closing to bridge any holes inside the document
      // (e.g. dark text on light page) so the document becomes a single white blob.
      const closeKernel = OpenCV.createObject(ObjectType.Size, 9, 9);
      const closeElement = OpenCV.invoke('getStructuringElement', MorphShapes.MORPH_RECT, closeKernel);
      if (closeElement) {
        OpenCV.invoke('morphologyEx', source, source, MorphTypes.MORPH_CLOSE, closeElement);
      }

      // Dilate so the outer boundary is well-defined.
      const dilateKernel = OpenCV.createObject(ObjectType.Size, 3, 3);
      const dilateElement = OpenCV.invoke('getStructuringElement', MorphShapes.MORPH_RECT, dilateKernel);
      const anchor = OpenCV.createObject(ObjectType.Point, -1, -1);
      const borderValue = OpenCV.createObject(ObjectType.Scalar, 0, 0, 0, 0);
      OpenCV.invoke('dilate', source, source, dilateElement, anchor, 1, BorderTypes.BORDER_DEFAULT, borderValue);

      // Find only the OUTERMOST contours (RETR_EXTERNAL) — we want the document's
      // outer edge, not internal sub-regions like the receipt's header rectangle.
      const contours = OpenCV.createObject(ObjectType.MatVector);
      OpenCV.invoke('findContours', source, contours, RetrievalModes.RETR_EXTERNAL, ContourApproximationModes.CHAIN_APPROX_SIMPLE);
      if (!contours) return;

      const contoursData = OpenCV.toJSValue(contours);
      let maxArea = 0;
      const frameArea = scaledWidth * scaledHeight;
      // Tightened from 0.95 → 0.85 so a uniform surface (wood, wall, desk) that
      // Otsu binarises into one huge blob doesn't qualify as a "document". A
      // real handheld ticket scan typically fills 30-80% of the frame with
      // visible margin around it; anything past 85% is almost certainly noise.
      const MAX_AREA = frameArea * 0.85;
      const MIN_AREA = 100;
      const MIN_AREA_RATIO = 0.08;
      // Reject contours whose bounding box touches the frame edge — a real
      // document has visible margin around it. False detections on uniform
      // surfaces nearly always produce a blob that extends to all four edges.
      const EDGE_MARGIN_PX = Math.max(2, Math.floor(Math.min(scaledWidth, scaledHeight) * 0.02));

      for (let i = 0; i < contoursData.array.length; i++) {
        const contour = OpenCV.copyObjectFromVector(contours, i);
        const { value: area } = OpenCV.invoke('contourArea', contour, false);
        if (area <= MIN_AREA || area <= maxArea) continue;

        const areaRatio = area / frameArea;
        if (areaRatio < MIN_AREA_RATIO || area > MAX_AREA) continue;

        // Approximate polygon. Widen the epsilon ladder so receipts/long narrow
        // documents that don't collapse to exactly 4 points at low epsilon still get
        // a chance at higher epsilon before we fall back.
        const { value: perimeter } = OpenCV.invoke('arcLength', contour, true);
        const epsilons = [0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06, 0.08, 0.1];
        let approxPoints: DocumentCorner[] | null = null;

        for (const mult of epsilons) {
          const approxPV = OpenCV.createObject(ObjectType.PointVector);
          OpenCV.invoke('approxPolyDP', contour, approxPV, mult * perimeter, true);
          const result = OpenCV.toJSValue(approxPV);
          const pts = (result as any)?.array || [];
          if (pts.length === 4) {
            approxPoints = pts.map((p: any) => ({ x: p.x, y: p.y }));
            break;
          }
          // Once epsilon collapses to below 4 points, escalating further only loses detail.
          if (pts.length < 4) break;
        }

        if (!approxPoints) {
          // Fallback: minAreaRect produces a rotated 4-point quad that hugs the
          // contour tightly, much better than axis-aligned boundingRect for tilted
          // documents.
          // react-native-fast-opencv returns an object handle from invoke() — must
          // call toJSValue() to get the underlying numbers. The previous code read
          // `.value` directly which always returned undefined and silently failed.
          try {
            const rotatedRectHandle = OpenCV.invoke('minAreaRect', contour) as any;
            const minRect = OpenCV.toJSValue(rotatedRectHandle) as unknown as
              | { centerX: number; centerY: number; width: number; height: number; angle: number }
              | undefined;
            if (minRect && minRect.width > 0 && minRect.height > 0) {
              const cx = minRect.centerX;
              const cy = minRect.centerY;
              const w = minRect.width / 2;
              const h = minRect.height / 2;
              const a = (minRect.angle * Math.PI) / 180;
              const cos = Math.cos(a);
              const sin = Math.sin(a);
              // Rotate the four corners around the center
              approxPoints = [
                { x: cx + (-w * cos - -h * sin), y: cy + (-w * sin + -h * cos) },
                { x: cx + (w * cos - -h * sin), y: cy + (w * sin + -h * cos) },
                { x: cx + (w * cos - h * sin), y: cy + (w * sin + h * cos) },
                { x: cx + (-w * cos - h * sin), y: cy + (-w * sin + h * cos) },
              ];
            }
          } catch {
            // minAreaRect failed — try axis-aligned bounding rect
          }
        }

        if (!approxPoints) {
          // Last resort: axis-aligned bounding rect. Same toJSValue treatment as above.
          try {
            const rectHandle = OpenCV.invoke('boundingRect', contour) as any;
            const rect = OpenCV.toJSValue(rectHandle) as unknown as
              | { x: number; y: number; width: number; height: number }
              | undefined;
            if (rect && rect.width > 0 && rect.height > 0) {
              approxPoints = [
                { x: rect.x, y: rect.y },
                { x: rect.x + rect.width, y: rect.y },
                { x: rect.x + rect.width, y: rect.y + rect.height },
                { x: rect.x, y: rect.y + rect.height },
              ];
            }
          } catch {
            continue;
          }
        }
        if (!approxPoints) continue;

        if (!validateRectangularShape(approxPoints)) continue;

        // Reject polygons that touch THREE OR MORE sides of the frame — a real
        // hand-held document scan can touch one or even two sides (e.g. the
        // user is close and only the left & right margins of an A4 letter
        // overflow), but touching 3+ sides means the polygon is essentially
        // the whole frame and we're locked onto a uniform surface, not a doc.
        // Track distinct sides, not corner-axis intersections (a single corner
        // at frame-corner would otherwise count twice).
        let touchesLeft = false;
        let touchesTop = false;
        let touchesRight = false;
        let touchesBottom = false;
        for (const p of approxPoints) {
          if (p.x <= EDGE_MARGIN_PX) touchesLeft = true;
          if (p.y <= EDGE_MARGIN_PX) touchesTop = true;
          if (p.x >= scaledWidth - EDGE_MARGIN_PX) touchesRight = true;
          if (p.y >= scaledHeight - EDGE_MARGIN_PX) touchesBottom = true;
        }
        const sidesTouched =
          (touchesLeft ? 1 : 0) +
          (touchesTop ? 1 : 0) +
          (touchesRight ? 1 : 0) +
          (touchesBottom ? 1 : 0);
        if (sidesTouched >= 3) continue;

        maxArea = area;
        bestContour = approxPoints;

        // Confidence based on area coverage. With Otsu-based outer-contour
        // detection, the document naturally fills 50-80% of the frame at a
        // normal scanning distance — treat that as ideal.
        if (areaRatio >= 0.30 && areaRatio <= 0.85) {
          detectionConfidence = 1.0;
        } else if (areaRatio > 0.85 && areaRatio <= 0.95) {
          // Too close
          detectionConfidence = 0.8;
        } else if (areaRatio >= 0.15 && areaRatio < 0.30) {
          // Bit far but still usable
          detectionConfidence = 0.8;
        } else if (areaRatio >= 0.05 && areaRatio < 0.15) {
          // Far
          detectionConfidence = 0.65;
        } else {
          detectionConfidence = 0.6;
        }
      }

      if (!bestContour || bestContour.length !== 4) {
        detectionConfidence = 0;
      }

      // Frame voting
      const rawFound = bestContour !== null && bestContour.length === 4;
      detectionVotes.value.push(rawFound);
      if (detectionVotes.value.length > VOTE_HISTORY_SIZE) {
        detectionVotes.value.shift();
      }
      let votes = 0;
      for (const v of detectionVotes.value) {
        if (v) votes++;
      }
      const isWarmingUp = detectionVotes.value.length < VOTE_HISTORY_SIZE;
      if (isWarmingUp && votes < VOTE_THRESHOLD) {
        detectionConfidence = 0;
      }

      // Confidence EMA smoothing
      smoothedConfidence.value =
        CONFIDENCE_SMOOTHING * detectionConfidence +
        (1 - CONFIDENCE_SMOOTHING) * smoothedConfidence.value;

      // State machine with hysteresis
      if (detectionState.value === DetectionState.NO_DOCUMENT) {
        if (postExitGraceCounter.value > 0) {
          postExitGraceCounter.value--;
          stableFrameCount.value = 0;
        } else {
          if (smoothedConfidence.value >= ENTER_THRESHOLD) {
            stableFrameCount.value++;
            if (stableFrameCount.value >= MIN_STABLE_FRAMES) {
              detectionState.value = DetectionState.DOCUMENT_DETECTED;
              stableFrameCount.value = 0;
            }
          } else if (stableFrameCount.value > 0) {
            stableFrameCount.value = 0;
          }
        }
      } else {
        if (smoothedConfidence.value < EXIT_THRESHOLD) {
          stableFrameCount.value++;
          if (stableFrameCount.value >= MIN_STABLE_FRAMES) {
            detectionState.value = DetectionState.NO_DOCUMENT;
            stableFrameCount.value = 0;
            postExitGraceCounter.value = POST_EXIT_GRACE_FRAMES;
          }
        } else if (stableFrameCount.value > 0) {
          stableFrameCount.value = 0;
        }
      }

      // Smooth corners + persistence
      if (bestContour && bestContour.length === 4) {
        const shouldAccept =
          detectionState.value === DetectionState.NO_DOCUMENT ||
          !smoothedCorners.value ||
          areCornersSimular(bestContour, smoothedCorners.value, 0.15);

        if (shouldAccept) {
          smoothedCorners.value = smoothCorners(bestContour, smoothedCorners.value, CORNER_SMOOTHING);
          cornerPersistenceCounter.value = CORNER_PERSISTENCE_FRAMES;
        } else {
          if (cornerPersistenceCounter.value > 0) {
            cornerPersistenceCounter.value--;
          } else {
            smoothedCorners.value = null;
          }
        }
      } else {
        if (cornerPersistenceCounter.value > 0) {
          cornerPersistenceCounter.value--;
        } else {
          smoothedCorners.value = null;
        }
      }

      // Stability tracking — runs whenever we have a confidently-detected
      // document, regardless of the autoCaptureEnabled toggle. We need
      // stabilityProgress to drive the live-OCR chip overlay even when the
      // user has auto-capture disabled.
      if (
        !autoCaptureTriggered.value &&
        detectionState.value === DetectionState.DOCUMENT_DETECTED &&
        smoothedConfidence.value >= AUTO_CAPTURE_CONFIDENCE_THRESHOLD &&
        smoothedCorners.value
      ) {
        const isStable = lastStableCorners.value
          ? areCornersSimular(smoothedCorners.value, lastStableCorners.value, AUTO_CAPTURE_MOVEMENT_THRESHOLD)
          : false;

        if (isStable) {
          stabilityCounter.value++;
          const progress = Math.min(stabilityCounter.value / AUTO_CAPTURE_STABILITY_FRAMES, 1.0);
          if (onStabilityUpdateJS) onStabilityUpdateJS(progress);

          // Only the auto-fire-the-shutter step is gated on autoCaptureEnabled.
          if (
            autoCaptureEnabled.value &&
            stabilityCounter.value >= AUTO_CAPTURE_STABILITY_FRAMES
          ) {
            autoCaptureTriggered.value = true;
            stabilityCounter.value = 0;
            if (onAutoCaptureJS) onAutoCaptureJS();
            autoCaptureResetFrameCount.value = AUTOCAPTURE_RESET_FRAMES;
          }
        } else {
          stabilityCounter.value = 0;
          lastStableCorners.value = smoothedCorners.value.map(c => ({ ...c }));
          if (onStabilityUpdateJS) onStabilityUpdateJS(0);
        }
      } else if (stabilityCounter.value > 0) {
        stabilityCounter.value = 0;
        if (onStabilityUpdateJS) onStabilityUpdateJS(0);
      }

      // Update shared values for Skia Canvas overlay
      const isCurrentlyDetected = detectionState.value === DetectionState.DOCUMENT_DETECTED;
      isDetected.value = isCurrentlyDetected;
      confidenceValue.value = smoothedConfidence.value;

      if (isCurrentlyDetected && smoothedCorners.value) {
        // Map corners from frame-space into "rotated frame" space — what the user
        // sees BEFORE any cover-crop applied by the Camera preview. The cover-fit
        // correction happens in DocumentOverlay using frameAspectRatio + canvas size.
        const fw = frame.width;
        const fh = frame.height;
        const orientation = frame.orientation;
        const isLandscape = orientation === 'landscape-left' || orientation === 'landscape-right';
        // After rotation: rotated width × rotated height
        const rotatedW = isLandscape ? fh : fw;
        const rotatedH = isLandscape ? fw : fh;
        frameAspectRatio.value = rotatedW / rotatedH;
        cornersNormalized.value = smoothedCorners.value.map((c) => {
          const fx = (c.x * SCALE_FACTOR) / fw; // 0-1 in frame x
          const fy = (c.y * SCALE_FACTOR) / fh; // 0-1 in frame y
          // For each orientation, rotate the [fx, fy] point so it lines up with
          // the preview-as-displayed (in rotated-frame normalized space).
          if (orientation === 'landscape-left') {
            // Frame is rotated 90° CCW relative to display — counter-rotate 90° CW
            return { x: 1 - fy, y: fx };
          }
          if (orientation === 'landscape-right') {
            // Frame is rotated 90° CW relative to display — counter-rotate 90° CCW
            return { x: fy, y: 1 - fx };
          }
          if (orientation === 'portrait-upside-down') {
            return { x: 1 - fx, y: 1 - fy };
          }
          // 'portrait' — no rotation needed
          return { x: fx, y: fy };
        });
      } else {
        cornersNormalized.value = null;
      }

      // Callback to JS thread
      if (onDetectionUpdateJS) {
        onDetectionUpdateJS(cornersNormalized.value, smoothedConfidence.value, frameAspectRatio.value);
      }
    } catch {
      // Reset on error
      cornersNormalized.value = null;
      confidenceValue.value = 0;
      isDetected.value = false;
    } finally {
      try {
        OpenCV.clearBuffers();
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [onDetectionUpdateJS, onAutoCaptureJS, onStabilityUpdateJS]);

  return {
    frameProcessor,
    // Shared values for Skia Canvas overlay (read on UI thread)
    cornersNormalized,
    confidenceValue,
    isDetected,
    frameAspectRatio,
    // Auto-capture controls
    setAutoCaptureEnabled: (enabled: boolean) => {
      autoCaptureEnabled.value = enabled;
    },
    resetAutoCapture: () => {
      autoCaptureTriggered.value = false;
      stabilityCounter.value = 0;
    },
  };
};
