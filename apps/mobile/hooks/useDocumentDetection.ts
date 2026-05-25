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
} from 'react-native-fast-opencv';

export type DocumentCorner = {
  x: number;
  y: number;
};

export type DocumentDetectionCallbacks = {
  onDetectionUpdate?: (corners: DocumentCorner[] | null, confidence: number) => void;
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
  if (aspectRatio > 4.0 || aspectRatio < 0.5) return false;

  const side1Diff = Math.abs(distances[0] - distances[2]) / Math.max(distances[0], distances[2]);
  const side2Diff = Math.abs(distances[1] - distances[3]) / Math.max(distances[1], distances[3]);
  if (side1Diff > 0.45 || side2Diff > 0.45) return false;

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
    if (angle < 45 || angle > 135) return false;
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

  const logFirstFrameJS = Worklets.createRunOnJS(() => {
    console.log('[scanner-diag] frame processor first tick');
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    frameCount.value += 1;
    if (frameCount.value === 1) {
      logFirstFrameJS();
    }

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

      // Gaussian blur
      const blurKernel = OpenCV.createObject(ObjectType.Size, 5, 5);
      OpenCV.invoke('GaussianBlur', source, source, blurKernel, 0);

      // Morphological closing
      const morphKernel = OpenCV.createObject(ObjectType.Size, 3, 3);
      const structElement = OpenCV.invoke('getStructuringElement', MorphShapes.MORPH_RECT, morphKernel);
      if (structElement) {
        OpenCV.invoke('morphologyEx', source, source, MorphTypes.MORPH_CLOSE, structElement);
      }

      // Canny edge detection (lower thresholds for parking tickets)
      OpenCV.invoke('Canny', source, source, 30, 90);

      // Dilate edges
      const dilateKernel = OpenCV.createObject(ObjectType.Size, 3, 3);
      const dilateElement = OpenCV.invoke('getStructuringElement', MorphShapes.MORPH_RECT, dilateKernel);
      const anchor = OpenCV.createObject(ObjectType.Point, -1, -1);
      const borderValue = OpenCV.createObject(ObjectType.Scalar, 0, 0, 0, 0);
      OpenCV.invoke('dilate', source, source, dilateElement, anchor, 2, BorderTypes.BORDER_DEFAULT, borderValue);

      // Smooth edges
      const smoothKernel = OpenCV.createObject(ObjectType.Size, 3, 3);
      OpenCV.invoke('GaussianBlur', source, source, smoothKernel, 0);

      // Find contours
      const contours = OpenCV.createObject(ObjectType.MatVector);
      OpenCV.invoke('findContours', source, contours, RetrievalModes.RETR_LIST, ContourApproximationModes.CHAIN_APPROX_SIMPLE);
      if (!contours) return;

      const contoursData = OpenCV.toJSValue(contours);
      let maxArea = 0;
      const frameArea = scaledWidth * scaledHeight;
      const MAX_AREA = frameArea * 0.6;
      const MIN_AREA = 100;
      const MIN_AREA_RATIO = 0.03;

      for (let i = 0; i < contoursData.array.length; i++) {
        const contour = OpenCV.copyObjectFromVector(contours, i);
        const { value: area } = OpenCV.invoke('contourArea', contour, false);
        if (area <= MIN_AREA || area <= maxArea) continue;

        const areaRatio = area / frameArea;
        if (areaRatio < MIN_AREA_RATIO || area > MAX_AREA) continue;

        // Approximate polygon
        const { value: perimeter } = OpenCV.invoke('arcLength', contour, true);
        const epsilons = [0.02, 0.025, 0.03, 0.035, 0.04, 0.05];
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
          if (pts.length < 4) break;
        }

        if (!approxPoints) {
          // Fallback: bounding rect
          try {
            const rectResult = OpenCV.invoke('boundingRect', contour) as any;
            const rect = rectResult?.value || rectResult;
            if (rect?.width > 0 && rect?.height > 0) {
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

        maxArea = area;
        bestContour = approxPoints;

        // Confidence based on area coverage
        if (areaRatio >= 0.15 && areaRatio <= 0.45) {
          detectionConfidence = 1.0;
        } else if (areaRatio > 0.45 && areaRatio <= 0.5) {
          detectionConfidence = 0.8;
        } else if (areaRatio >= 0.05 && areaRatio < 0.15) {
          detectionConfidence = 0.7;
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

      // Auto-capture
      if (
        autoCaptureEnabled.value &&
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

          if (stabilityCounter.value >= AUTO_CAPTURE_STABILITY_FRAMES) {
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
        // Normalize to 0-1 range (scale up from processing resolution, then divide by frame size)
        cornersNormalized.value = smoothedCorners.value.map(c => ({
          x: (c.x * SCALE_FACTOR) / frame.width,
          y: (c.y * SCALE_FACTOR) / frame.height,
        }));
      } else {
        cornersNormalized.value = null;
      }

      // Callback to JS thread
      if (onDetectionUpdateJS) {
        onDetectionUpdateJS(cornersNormalized.value, smoothedConfidence.value);
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
