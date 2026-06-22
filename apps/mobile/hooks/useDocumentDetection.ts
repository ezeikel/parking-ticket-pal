import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';
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
import {
  validateRectangularShape,
  isPlausibleVisionQuad,
  type DocumentCorner,
} from '@/lib/documentQuad';

// Re-exported for existing importers (e.g. PostCapturePreview, DocumentOverlay)
// that import the type from this hook. Canonical definition lives in lib/documentQuad.
export type { DocumentCorner };

export type DocumentDetectionCallbacks = {
  onDetectionUpdate?: (
    corners: DocumentCorner[] | null,
    confidence: number,
    frameAspectRatio: number,
  ) => void;
  onAutoCapture?: () => void;
  onStabilityUpdate?: (stabilityProgress: number) => void;
  // Fires once when a document has been continuously detected and held
  // ROUGHLY steady for a short window — a much looser bar than the auto-capture
  // stability above (which needs near-pixel-perfect stillness for 8 frames and
  // realistically never triggers handheld). This is the signal the live-OCR
  // chip overlay listens to: "a document is in frame and the user is settling
  // on it — good moment to run OCR." Re-fires only after the document leaves
  // and re-enters frame.
  onDocumentSteady?: () => void;
};

enum DetectionState {
  NO_DOCUMENT = 'no_document',
  DOCUMENT_DETECTED = 'document_detected',
}

// --- Worklet helpers ---
//
// validateRectangularShape + the Vision quad gate now live in lib/documentQuad
// so the live frame processor and the post-capture preview share one tested
// implementation. The OpenCV path below calls validateRectangularShape with the
// default OPENCV_ASPECT_FLOOR (1.10) — unchanged behaviour.

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

  // iOS-only premium detector: Apple Vision document segmentation, exposed as a
  // VisionCamera frame-processor plugin (modules/document-detector/ios/
  // VisionDocumentPlugin.mm). Null on Android (plugin not registered there), so
  // the worklet falls back to the OpenCV path everywhere it's unavailable.
  const visionDocPlugin = useMemo(
    () =>
      Platform.OS === 'ios'
        ? VisionCameraProxy.initFrameProcessorPlugin('detectDocumentFrame', {})
        : null,
    [],
  );

  if (__DEV__) {
    // Did the native Vision frame-processor plugin actually register? null here
    // => we're silently running OpenCV instead of Vision (e.g. dead-stripped, or
    // on Android). Read via `globalThis.__scannerDebug.visionPluginLinked`.
    const g = globalThis as { __scannerDebug?: Record<string, unknown> };
    g.__scannerDebug = {
      ...(g.__scannerDebug ?? {}),
      visionPluginLinked: visionDocPlugin != null,
    };
  }

  const onDetectionUpdateJS = callbacks?.onDetectionUpdate
    ? Worklets.createRunOnJS(callbacks.onDetectionUpdate)
    : null;
  const onAutoCaptureJS = callbacks?.onAutoCapture
    ? Worklets.createRunOnJS(callbacks.onAutoCapture)
    : null;
  const onStabilityUpdateJS = callbacks?.onStabilityUpdate
    ? Worklets.createRunOnJS(callbacks.onStabilityUpdate)
    : null;
  const onDocumentSteadyJS = callbacks?.onDocumentSteady
    ? Worklets.createRunOnJS(callbacks.onDocumentSteady)
    : null;

  // Dev-only probe of the RAW Vision plugin output + frame meta (orientation,
  // pixel format, dims). Read via `globalThis.__scannerDebug.visionRaw`. Lets us
  // confirm on a real device that Vision is running and inspect its corners.
  const debugVisionJS = __DEV__
    ? Worklets.createRunOnJS((info: unknown) => {
        const g = globalThis as { __scannerDebug?: Record<string, unknown> };
        g.__scannerDebug = { ...(g.__scannerDebug ?? {}), visionRaw: info };
      })
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

  // Live-OCR trigger state (independent of auto-capture). Counts consecutive
  // frames where a document is detected and held within a LOOSE tolerance, and
  // latches once fired so we only run OCR once per "framing session".
  const ocrSteadyCounter = useSharedValue<number>(0);
  const ocrSteadyCorners = useSharedValue<DocumentCorner[] | null>(null);
  const ocrTriggered = useSharedValue<boolean>(false);

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

  // Live-OCR trigger thresholds — deliberately looser than auto-capture so the
  // chip overlay actually fires when held by hand. ~4 frames (~0.25s at 15fps)
  // of a detected doc within 12% movement is enough to say "settling".
  const OCR_STEADY_FRAMES = 4;
  const OCR_MOVEMENT_THRESHOLD = 0.12;
  const OCR_CONFIDENCE_THRESHOLD = 0.6;

  // Apple Vision (iOS) is trusted as the detector when it reports at least this
  // confidence; otherwise we fall back to the OpenCV path for that frame.
  const VISION_CONFIDENCE_THRESHOLD = 0.5;

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

    // iOS premium path: Apple Vision document segmentation. When it confidently
    // finds the document we use its corners and skip OpenCV/Otsu entirely; the
    // downstream pipeline (voting, smoothing, state machine, normalization,
    // OCR trigger) runs identically on `bestContour`. visionDocPlugin is null on
    // Android, so OpenCV always runs there.
    let visionUsed = false;
    if (visionDocPlugin != null) {
      // Pass the frame orientation so the native plugin can rotate the buffer
      // upright before running Vision. Vision returns corners in UPRIGHT
      // (display) normalized space.
      const v = visionDocPlugin.call(frame, { orientation: frame.orientation }) as
        | {
            corners?: { x: number; y: number }[];
            confidence?: number;
            dbgReceivedOri?: string;
            dbgAppliedOri?: number;
            dbgPixelFormat?: string;
            dbgBufW?: number;
            dbgBufH?: number;
          }
        | null;
      // Gate Vision on geometry, not just confidence. Vision can report a high
      // confidence on a degenerate quad (e.g. the simulator's full-width bottom
      // band, or a fan-shaped misdetection), which would otherwise win over the
      // OpenCV path and draw a wrong box. isPlausibleVisionQuad runs the shared
      // validators on the display-normalized corners with the Vision aspect floor
      // (1.0 — a real PCN/NTK is near-square). Measured to pass 37/38 real
      // tickets; the 1 reject is a genuinely malformed detection. If Vision fails
      // the gate, visionUsed stays false and OpenCV runs for this frame.
      const visionCorners = v?.corners;
      const visionQuadOk =
        v != null &&
        (v.confidence ?? 0) >= VISION_CONFIDENCE_THRESHOLD &&
        visionCorners != null &&
        visionCorners.length === 4 &&
        isPlausibleVisionQuad(visionCorners);
      if (visionQuadOk) {
        // Inverse-rotate Vision's display-space corners back into raw-sensor
        // space so the downstream pipeline (and the cornersNormalized rotation
        // below) treats them exactly like OpenCV's output. This is the inverse
        // of the per-orientation raw->display map applied in the overlay step.
        const sw = Math.floor(frame.width / SCALE_FACTOR);
        const sh = Math.floor(frame.height / SCALE_FACTOR);
        const ori = frame.orientation;
        bestContour = visionCorners.map((c) => {
          let fx = c.x;
          let fy = c.y;
          if (ori === 'landscape-right') {
            fx = 1 - c.y;
            fy = c.x;
          } else if (ori === 'landscape-left') {
            fx = c.y;
            fy = 1 - c.x;
          } else if (ori === 'portrait-upside-down') {
            fx = 1 - c.x;
            fy = 1 - c.y;
          }
          return { x: fx * sw, y: fy * sh };
        });
        detectionConfidence = 1.0;
        visionUsed = true;
        if (debugVisionJS) {
          debugVisionJS({
            corners: v.corners,
            conf: v.confidence,
            ori: frame.orientation,
            fw: frame.width,
            fh: frame.height,
            dbgReceivedOri: v.dbgReceivedOri,
            dbgAppliedOri: v.dbgAppliedOri,
            dbgPixelFormat: v.dbgPixelFormat,
            dbgBufW: v.dbgBufW,
            dbgBufH: v.dbgBufH,
          });
        }
      }
    }

    try {
      if (!visionUsed) {
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

      } // end OpenCV detection (skipped when Apple Vision supplies the corners)

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

      // Live-OCR trigger — independent of, and much looser than, the
      // auto-capture stability above. Fires onDocumentSteady() once the
      // document has been detected and held within OCR_MOVEMENT_THRESHOLD for
      // OCR_STEADY_FRAMES, then latches (ocrTriggered) so OCR runs once per
      // framing session. Resets when the document leaves the frame so a new
      // framing re-fires. This is what drives the live chip overlay; the
      // strict auto-capture stability rarely triggers handheld.
      if (
        detectionState.value === DetectionState.DOCUMENT_DETECTED &&
        smoothedConfidence.value >= OCR_CONFIDENCE_THRESHOLD &&
        smoothedCorners.value
      ) {
        const ocrSteady = ocrSteadyCorners.value
          ? areCornersSimular(smoothedCorners.value, ocrSteadyCorners.value, OCR_MOVEMENT_THRESHOLD)
          : false;

        if (ocrSteady) {
          ocrSteadyCounter.value++;
          if (
            !ocrTriggered.value &&
            ocrSteadyCounter.value >= OCR_STEADY_FRAMES
          ) {
            ocrTriggered.value = true;
            if (onDocumentSteadyJS) onDocumentSteadyJS();
          }
        } else {
          // Moved too much — reset the steadiness baseline but DON'T clear the
          // latch (we still only want one OCR pass until the doc leaves frame).
          ocrSteadyCounter.value = 0;
          ocrSteadyCorners.value = smoothedCorners.value.map(c => ({ ...c }));
        }
      } else {
        // Document left the frame — reset everything so the next framing
        // session can fire OCR again.
        ocrSteadyCounter.value = 0;
        ocrSteadyCorners.value = null;
        ocrTriggered.value = false;
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
  }, [onDetectionUpdateJS, onAutoCaptureJS, onStabilityUpdateJS, onDocumentSteadyJS, visionDocPlugin, debugVisionJS]);

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
