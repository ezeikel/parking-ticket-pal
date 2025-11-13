import { useSkiaFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
import { Skia, PaintStyle, PointMode, vec } from '@shopify/react-native-skia';
import {
  OpenCV,
  ObjectType,
  ColorConversionCodes,
  MorphShapes,
  MorphTypes,
  RetrievalModes,
  ContourApproximationModes,
  DataTypes,
  BorderTypes
} from 'react-native-fast-opencv';

export type DocumentCorner = {
  x: number;
  y: number;
};

export type DocumentDetectionResult = {
  corners: DocumentCorner[] | null;
  confidence: number; // 0-1, where 1 is perfect detection
};

export type DebugData = {
  frameCount: number;
  renderCount: number;
  clearBufferCount: number;
  skiaDrawCount: number;
  errorCount: number;
  processingStep: string;
  debugInfo: string;
  lastRenderTime: number;
  lastError: string | null;
  // State machine debug data
  detectionState: string;
  stableFrameCount: number;
  postExitGraceCounter: number;
  lastStateTransition: string;
  skiaDrawSkipReason: string;
  smoothedConfidence: number;
};

export type DocumentDetectionCallbacks = {
  onFrameProcessed?: (data: DebugData) => void;
  onDetectionUpdate?: (corners: DocumentCorner[] | null, confidence: number) => void;
};

/**
 * Detection state machine states for temporal smoothing
 * Prevents flickering by using hysteresis (different enter/exit thresholds)
 */
enum DetectionState {
  NO_DOCUMENT = 'no_document',
  DOCUMENT_DETECTED = 'document_detected',
}

/**
 * Validates if a 4-point polygon is roughly rectangular
 * Checks aspect ratio and angle constraints to filter out weird shapes
 *
 * @param points Array of 4 points representing a quadrilateral
 * @returns true if shape passes rectangle validation
 */
const validateRectangularShape = (points: any[]): boolean => {
  'worklet';

  if (points.length !== 4) return false;

  // Calculate distances between consecutive points (side lengths)
  const distances: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % 4];
    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    distances.push(dist);
  }

  // Sort to get [shorter side, shorter side, longer side, longer side]
  const sortedDistances = [...distances].sort((a, b) => a - b);

  // Check aspect ratio: reject elongated rectangles
  // Documents range from:
  // - Standard letters: A4 (1.414:1) or Letter (1.29:1)
  // - Parking tickets: typically 3:1 to 4:1 (narrow and tall)
  // Allow wide range to support both document types
  const shortSide = (sortedDistances[0] + sortedDistances[1]) / 2;
  const longSide = (sortedDistances[2] + sortedDistances[3]) / 2;
  const aspectRatio = longSide / shortSide;

  // Reject if aspect ratio is too extreme (0.5-4.0 covers all real documents)
  // 5:1 ratio is a thin strip, not a document - this filters out false positives
  if (aspectRatio > 4.0 || aspectRatio < 0.5) {
    return false;
  }

  // Check that opposite sides are roughly equal (rectangle property)
  // Allow 35% variation for crumpled/creased documents like parking tickets
  // Creases and folds can cause perspective distortion that makes sides appear unequal
  const side1Diff = Math.abs(distances[0] - distances[2]) / Math.max(distances[0], distances[2]);
  const side2Diff = Math.abs(distances[1] - distances[3]) / Math.max(distances[1], distances[3]);

  if (side1Diff > 0.35 || side2Diff > 0.35) {
    return false;
  }

  // Calculate angles at each corner (should be roughly 90° for rectangles)
  for (let i = 0; i < 4; i++) {
    const p1 = points[(i - 1 + 4) % 4];
    const p2 = points[i];
    const p3 = points[(i + 1) % 4];

    // Vectors from p2 to p1 and p2 to p3
    const v1x = p1.x - p2.x;
    const v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;

    // Dot product and magnitudes
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    // Calculate angle in degrees
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);

    // Reject if angle is too far from 90°
    // Very relaxed for crumpled parking tickets: 45°-135° (allows significant distortion)
    // Upturned corners, creases, and folds can cause corners to deviate from perfect 90°
    if (angle < 45 || angle > 135) {
      return false;
    }
  }

  return true;
};

/**
 * Validates if new corners are similar enough to existing tracked corners
 * Prevents sudden shape morphing by rejecting contours that are too different
 *
 * @param newCorners - New corner positions from current detection
 * @param existingCorners - Currently tracked smoothed corner positions
 * @param maxMovementRatio - Maximum allowed movement as ratio of document size (e.g., 0.15 = 15%)
 * @returns true if corners are similar enough to accept
 */
const areCornersSimular = (
  newCorners: DocumentCorner[],
  existingCorners: DocumentCorner[],
  maxMovementRatio: number
): boolean => {
  'worklet';

  if (newCorners.length !== 4 || existingCorners.length !== 4) {
    return false;
  }

  // Calculate current document size (bounding box diagonal)
  const existingXs = existingCorners.map(c => c.x);
  const existingYs = existingCorners.map(c => c.y);
  const width = Math.max(...existingXs) - Math.min(...existingXs);
  const height = Math.max(...existingYs) - Math.min(...existingYs);
  const documentSize = Math.sqrt(width * width + height * height);

  // Calculate average corner movement
  let totalMovement = 0;
  for (let i = 0; i < 4; i++) {
    const dx = newCorners[i].x - existingCorners[i].x;
    const dy = newCorners[i].y - existingCorners[i].y;
    const movement = Math.sqrt(dx * dx + dy * dy);
    totalMovement += movement;
  }
  const avgMovement = totalMovement / 4;

  // Reject if average corner movement exceeds threshold
  const maxAllowedMovement = documentSize * maxMovementRatio;
  return avgMovement <= maxAllowedMovement;
};

/**
 * Smooths corner positions using exponential moving average
 * Reduces visual jitter in the overlay rectangle
 *
 * @param newCorners - Raw corner positions from current frame
 * @param previousCorners - Smoothed corner positions from previous frame
 * @param alpha - Smoothing factor (0-1), higher = more responsive
 * @returns Smoothed corner positions
 */
const smoothCorners = (
  newCorners: DocumentCorner[],
  previousCorners: DocumentCorner[] | null,
  alpha: number
): DocumentCorner[] => {
  'worklet';

  if (!previousCorners || previousCorners.length !== 4) {
    return newCorners; // First detection, no smoothing
  }

  return newCorners.map((corner, i) => ({
    x: alpha * corner.x + (1 - alpha) * previousCorners[i].x,
    y: alpha * corner.y + (1 - alpha) * previousCorners[i].y,
  }));
};

/**
 * Custom hook for real-time document edge detection using OpenCV
 *
 * Performance optimizations:
 * - Processes at 1/4 scale (16x faster than full resolution)
 * - Targets 10 FPS processing rate via frame limiting
 * - Uses runOnJS to bridge worklet values to React state
 *
 * @param callbacks - Optional callbacks for receiving updates from frame processor
 * @returns Frame processor and detection result shared values
 */
export const useDocumentDetection = (callbacks?: DocumentDetectionCallbacks) => {
  const { resize } = useResizePlugin();

  // Create worklet-compatible callbacks using Worklets.createRunOnJS
  const onFrameProcessedJS = callbacks?.onFrameProcessed
    ? Worklets.createRunOnJS(callbacks.onFrameProcessed)
    : null;
  const onDetectionUpdateJS = callbacks?.onDetectionUpdate
    ? Worklets.createRunOnJS(callbacks.onDetectionUpdate)
    : null;

  // Shared values for cross-worklet communication (no bridge crossing)
  const detectedCorners = useSharedValue<DocumentCorner[] | null>(null);
  const smoothedCorners = useSharedValue<DocumentCorner[] | null>(null);
  const confidence = useSharedValue<number>(0);

  // Corner smoothing factor (0-1, higher = more responsive but more jitter)
  const CORNER_SMOOTHING = 0.3;

  // Corner persistence: keep corners visible even when temporarily not detected
  const CORNER_PERSISTENCE_FRAMES = 3;  // Keep corners for 3 frames after detection loss
  const cornerPersistenceCounter = useSharedValue<number>(0);

  // Frame voting buffer to prevent single-frame failures from crashing confidence
  const VOTE_HISTORY_SIZE = 5;      // Look at last 5 frames
  const VOTE_THRESHOLD = 3;          // Need 3/5 frames to agree
  const detectionVotes = useSharedValue<boolean[]>([]);

  const frameCount = useSharedValue<number>(0); // Debug: track frame processor execution
  const lastError = useSharedValue<string | null>(null); // Debug: track last error message
  const processingStep = useSharedValue<string>('idle'); // Debug: track current processing step
  const debugInfo = useSharedValue<string>(''); // Debug: additional info about detection

  // Debug counters to diagnose freezing
  const renderCount = useSharedValue<number>(0); // How many times frame.render() called
  const clearBufferCount = useSharedValue<number>(0); // How many times clearBuffers() succeeded
  const skiaDrawCount = useSharedValue<number>(0); // How many times Skia drawing executed
  const errorCount = useSharedValue<number>(0); // How many errors occurred
  const lastRenderTime = useSharedValue<number>(0); // Timestamp of last render

  // Debug values for state machine diagnostics
  const detectionStateDebug = useSharedValue<string>('no_document');
  const stableFrameCountDebug = useSharedValue<number>(0);
  const postExitGraceCounterDebug = useSharedValue<number>(0);
  const lastStateTransition = useSharedValue<string>('none');
  const skiaDrawSkipReason = useSharedValue<string>('');
  const smoothedConfidenceDebug = useSharedValue<number>(0);

  // Confidence smoothing: use exponential moving average to reduce flickering
  const smoothedConfidence = useSharedValue<number>(0);
  const CONFIDENCE_SMOOTHING = 0.3; // 30% new value, 70% old value (higher = more responsive)

  // State machine for stable detection (prevents flickering with hysteresis)
  const detectionState = useSharedValue<DetectionState>(DetectionState.NO_DOCUMENT);
  const stableFrameCount = useSharedValue<number>(0);
  const postExitGraceCounter = useSharedValue<number>(0);  // Debounce counter after exit

  // Hysteresis thresholds to prevent rapid state transitions
  const ENTER_THRESHOLD = 0.6;  // Need 60% confidence to show overlay
  const EXIT_THRESHOLD = 0.3;   // Must drop below 30% to hide overlay (more realistic with EMA)
  const MIN_STABLE_FRAMES = 4;  // Require 4 consecutive frames (400ms at 10 FPS)
  const POST_EXIT_GRACE_FRAMES = 3;  // Prevent immediate re-entry after exit (debounce)

  // Create Skia paint objects OUTSIDE worklet (like blog post)
  // Creating inside worklet recreates on every frame and can cause issues
  const paint = Skia.Paint();
  const border = Skia.Paint();
  paint.setStyle(PaintStyle.Fill);
  paint.setColor(Skia.Color(0x40_00_ff_00)); // Semi-transparent green fill (25% opacity)
  border.setStyle(PaintStyle.Stroke);
  border.setColor(Skia.Color(0xff_00_ff_00)); // Solid green border
  border.setStrokeWidth(4);

  /**
   * Main frame processor for document detection with Skia drawing
   *
   * FPS LIMITATION WORKAROUND:
   * Processing at 10 FPS to prevent memory leak crashes on Skia 2.2.10
   * while maintaining good detection responsiveness
   * See: https://github.com/mrousavy/react-native-vision-camera/issues/3598
   *
   * Above 12-15 FPS causes crashes due to memory leaks in older Skia versions.
   *
   * FLICKER FIX:
   * Heavy OpenCV processing runs at 10 FPS, but frame.render() and Skia overlay
   * drawing happen on EVERY frame (30 FPS) using cached detection results.
   * This eliminates flickering while keeping CPU usage reasonable.
   */
  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet';

    // Define variables for this frame
    const SCALE_FACTOR = 4;
    let bestContour: DocumentCorner[] | null = null;

    try {
      // Log first frame only
      if (frameCount.value === 0) {
        console.log('[DocumentDetection] First frame received! Frame processor is running.');
      }

      // Increment frame counter for ALL frames
      frameCount.value = frameCount.value + 1;

      // FPS LIMITING: Only run heavy OpenCV processing every Nth frame
      // At 30 FPS camera: process every 3rd frame = 10 FPS processing rate
      // But we'll still render and draw overlay on ALL frames using cached detection results
      const TARGET_FPS = 10;
      const skipFrames = Math.floor(30 / TARGET_FPS); // Assuming 30 FPS camera
      const shouldProcessDetection = (frameCount.value - 1) % skipFrames === 0;

      // Only run heavy detection processing on designated frames
      if (shouldProcessDetection) {
        // PROCESS THIS FRAME (every 3rd frame = 10 FPS)
        lastError.value = null;

      // Step 1: Calculate scaled dimensions (1/4 resolution for 16x speedup)
      processingStep.value = 'calculating_dimensions';
        const scaledWidth = Math.floor(frame.width / SCALE_FACTOR);
        const scaledHeight = Math.floor(frame.height / SCALE_FACTOR);

        if (scaledWidth <= 0 || scaledHeight <= 0) {
          throw new Error(`Invalid scaled dimensions: ${scaledWidth}x${scaledHeight}`);
        }

        // Step 2: Resize frame using GPU-accelerated plugin
        processingStep.value = 'resizing_frame';
        // Use BGR format as OpenCV expects BGR by default
        const resizedBuffer = resize(frame, {
          scale: { width: scaledWidth, height: scaledHeight },
          pixelFormat: 'bgr',
          dataType: 'uint8',
        });

        if (!resizedBuffer || resizedBuffer.length === 0) {
          throw new Error('Resize plugin returned empty buffer');
        }

        // Validate buffer size matches expected dimensions
        // For BGR format: width * height * 3 channels
        const expectedBufferSize = scaledWidth * scaledHeight * 3;
        if (resizedBuffer.length !== expectedBufferSize) {
          throw new Error(
            `Buffer size mismatch: expected ${expectedBufferSize} bytes, got ${resizedBuffer.length} bytes. ` +
            `Dimensions: ${scaledWidth}x${scaledHeight}, channels: 3`
          );
        }

        // Step 3: Convert buffer to OpenCV Mat
        processingStep.value = 'converting_to_mat';
        const source = OpenCV.bufferToMat(
          'uint8',      // Data type - MUST be first parameter
          scaledHeight,
          scaledWidth,
          3,            // 3 channels (BGR)
          resizedBuffer
        );

        if (!source) {
          throw new Error('Failed to create OpenCV Mat from buffer');
        }

        // Step 4: Convert to grayscale for edge detection
        processingStep.value = 'converting_to_grayscale';
        OpenCV.invoke('cvtColor', source, source, ColorConversionCodes.COLOR_BGR2GRAY);

        // Step 5: Apply Gaussian blur to reduce noise
        processingStep.value = 'applying_blur';
        const blurKernel = OpenCV.createObject(ObjectType.Size, 5, 5);
        OpenCV.invoke('GaussianBlur', source, source, blurKernel, 0);

        // Step 6: Create structuring element for morphological operations
        processingStep.value = 'creating_structuring_element';
        const morphKernel = OpenCV.createObject(ObjectType.Size, 3, 3);
        const structElement = OpenCV.invoke(
          'getStructuringElement',
          MorphShapes.MORPH_RECT,
          morphKernel
        );

        if (!structElement) {
          throw new Error('Failed to create structuring element');
        }

        // Step 7: Apply morphological closing to fill small gaps and connect edges
        // This helps detect documents with weak/broken edges (like parking tickets)
        processingStep.value = 'applying_morph_close';
        OpenCV.invoke('morphologyEx', source, source, MorphTypes.MORPH_CLOSE, structElement);

        // Step 8: Apply Canny edge detection with LOWER thresholds
        // Lower thresholds (30/90 vs 50/120) make it more sensitive to weak edges
        // This is crucial for detecting low-contrast documents like parking tickets
        processingStep.value = 'applying_canny';
        OpenCV.invoke('Canny', source, source, 30, 90);

        // Step 9: Apply dilation to strengthen detected edges
        // This makes weak edges more prominent and helps connect nearby edge segments
        processingStep.value = 'dilating_edges';
        const dilateKernel = OpenCV.createObject(ObjectType.Size, 3, 3);
        const dilateElement = OpenCV.invoke(
          'getStructuringElement',
          MorphShapes.MORPH_RECT,
          dilateKernel
        );
        const anchor = OpenCV.createObject(ObjectType.Point, -1, -1);
        const borderValue = OpenCV.createObject(ObjectType.Scalar, 0, 0, 0, 0);
        OpenCV.invoke('dilate', source, source, dilateElement, anchor, 2, BorderTypes.BORDER_DEFAULT, borderValue);

        // Step 10: Apply light Gaussian blur to smooth noisy edges
        // This helps with parking tickets that have decorative text borders
        // The blur reduces jagged edges while preserving corner structure
        processingStep.value = 'smoothing_edges';
        const smoothKernel = OpenCV.createObject(ObjectType.Size, 3, 3);
        OpenCV.invoke('GaussianBlur', source, source, smoothKernel, 0);

        // Step 11: Find contours in the edge-detected image
        processingStep.value = 'finding_contours';
        const contours = OpenCV.createObject(ObjectType.MatVector);
        OpenCV.invoke(
          'findContours',
          source,
          contours,
          RetrievalModes.RETR_LIST, // All contours without hierarchy (article approach)
          ContourApproximationModes.CHAIN_APPROX_SIMPLE // Compress contours (faster)
        );

        if (!contours) {
          throw new Error('Failed to create contours MatVector');
        }

        // Step 11: Find the largest quadrilateral contour (likely the document)
        processingStep.value = 'processing_contours';
        const contoursData = OpenCV.toJSValue(contours);
        // bestContour defined at top of frame processor
        let maxArea = 0;
        let detectionConfidence = 0;

        // Minimum and maximum area thresholds (scaled to processing resolution)
        // At 1/4 scale: 150 pixels minimum
        // Lowered from 200 to better support smaller documents like parking tickets
        // Parking tickets at arm's length might only be 50x130 pixels = 6,500 pixels total
        const MIN_AREA = 150;

        // Calculate frame area for filtering and confidence scoring
        const frameArea = scaledWidth * scaledHeight;

        // Maximum area: reject contours larger than 60% of frame (relaxed from 50%)
        // Allows larger documents while still filtering table/floor edges
        const MAX_AREA = frameArea * 0.6;

        // Minimum area: require at least 3% of frame (relaxed from 5%)
        // Allows detection of thin parking tickets which have less area than letters
        const MIN_AREA_RATIO = 0.03;

        // Debug: Log contour count
        const contourCount = contoursData.array.length;
        let largeContourCount = 0;
        let totalArea = 0;
        let maxContourArea = 0;
        
        // First pass: analyze all contours
        for (let i = 0; i < contoursData.array.length; i++) {
          const contour = OpenCV.copyObjectFromVector(contours, i);
          const { value: area } = OpenCV.invoke('contourArea', contour, false);
          totalArea += area;
          if (area > maxContourArea) maxContourArea = area;
          if (area > MIN_AREA) largeContourCount++;
        }
        
        debugInfo.value = `Found ${contourCount} contours, frame: ${scaledWidth}x${scaledHeight}, maxArea=${maxContourArea.toFixed(0)}, large=${largeContourCount}, MIN=${MIN_AREA}`;

        for (let i = 0; i < contoursData.array.length; i++) {
          const contour = OpenCV.copyObjectFromVector(contours, i);
          const { value: area } = OpenCV.invoke('contourArea', contour, false);

          // Filter out small contours
          if (area > MIN_AREA) {
            // Debug: Log large contours found
            debugInfo.value = `${debugInfo.value}, [${i}]area=${area.toFixed(0)}`;

            // SIMPLIFIED DOCUMENT DETECTION - NO CONVEX HULL
            // Standard approach: contour → approxPolyDP → 4 corners
            // ConvexHull is unnecessary - documents are already convex rectangles

            // Get perimeter directly from contour for epsilon calculation
            const { value: perimeter } = OpenCV.invoke('arcLength', contour, true);

            // Apply adaptive epsilon to find 4-point polygon
            processingStep.value = 'approximating_contour';
            let approxData: any = null;

            try {
              // Simplified epsilon values - start small for accuracy
              // Lower values (0.02-0.05) work for both clean letters and noisy parking tickets
              const epsilonMultipliers = [0.02, 0.025, 0.03, 0.035, 0.04, 0.05];
              let foundFourPoints = false;

              for (const multiplier of epsilonMultipliers) {
                const epsilon = multiplier * perimeter;

                // Create PointVector for approxPolyDP output
                const approxPointVector = OpenCV.createObject(ObjectType.PointVector);

                // Apply approxPolyDP DIRECTLY to contour (no hull needed!)
                OpenCV.invoke('approxPolyDP', contour, approxPointVector, epsilon, true);

                // Extract result using toJSValue (works with PointVector!)
                const approxResult = OpenCV.toJSValue(approxPointVector);
                const points = (approxResult as any)?.array || [];
                const pointCount = points.length;

                // Check if polygon has exactly 4 corners (quadrilateral - document)
                if (pointCount === 4) {
                  approxData = { array: points };
                  foundFourPoints = true;
                  debugInfo.value = `${debugInfo.value}, approx=${pointCount}pts ✓`;
                  break;
                } else if (pointCount < 4) {
                  // Epsilon too large, simplified too much
                  debugInfo.value = `${debugInfo.value}, approx=${pointCount}pts, tooFew`;
                  break;
                }
                // If pointCount > 4, continue to next epsilon (need more simplification)
              }

              // Process the 4-point contour if we found one
              if (!foundFourPoints || !approxData) {
                debugInfo.value = `${debugInfo.value}, noQuad`;
                continue;
              }
            } catch (approxError) {
              // If approxPolyDP fails, fallback to boundingRect
              const errorMsg = approxError instanceof Error ? approxError.message : String(approxError);
              debugInfo.value = `${debugInfo.value}, approxError: ${errorMsg}`;
              console.warn('[DocumentDetection] approxPolyDP failed, using boundingRect fallback:', errorMsg);
              
              try {
                const rectResult = OpenCV.invoke('boundingRect', contour) as any;
                const rect = rectResult?.value || rectResult;
                
                if (rect && rect.x !== undefined && rect.width !== undefined) {
                  const x = rect.x || 0;
                  const y = rect.y || 0;
                  const w = rect.width || 0;
                  const h = rect.height || 0;
                  
                  if (w > 0 && h > 0) {
                    approxData = {
                      array: [
                        { x: x, y: y },
                        { x: x + w, y: y },
                        { x: x + w, y: y + h },
                        { x: x, y: y + h }
                      ]
                    };
                    debugInfo.value = `${debugInfo.value}, fallback=boundingRect`;
                  } else {
                    continue;
                  }
                } else {
                  continue;
                }
              } catch (rectError) {
                debugInfo.value = `${debugInfo.value}, rectError: ${rectError}`;
                continue;
              }
            }

            // At this point, we have valid 4-point approximation
            // Check if this is the largest valid contour so far
            if (area > maxArea) {
              // Calculate area ratio for validation
              const areaRatio = area / frameArea;

              // Validate area is within reasonable bounds for a document
              // Skip if too small (< 5%) or too large (> 70% - likely table/floor)
              if (areaRatio < MIN_AREA_RATIO || area > MAX_AREA) {
                debugInfo.value = `${debugInfo.value}, skippedArea:${(areaRatio * 100).toFixed(1)}%`;
                continue;
              }

              // Note: Removed strict convexity check as real documents can appear slightly
              // concave due to perspective distortion, paper curves, or edge detection artifacts.
              // The rectangular shape validation below is sufficient to identify documents.

              // Validate shape is roughly rectangular (not too skewed/distorted)
              const points = approxData.array;
              const isValidRectangle = validateRectangularShape(points);

              if (!isValidRectangle) {
                debugInfo.value = `${debugInfo.value}, skippedShape`;
                continue;
              }

              // This is a valid candidate - update best contour
              maxArea = area;

              // Keep corners in scaled (processing) resolution
              // We'll scale them when drawing on the full-size frame
              bestContour = approxData.array.map((point: any) => ({
                x: point.x,
                y: point.y,
              }));

              // Calculate confidence score (0-1) based on area coverage
              // Optimal document size: 15-45% of frame (tighter range for better documents)
              if (areaRatio >= 0.15 && areaRatio <= 0.45) {
                detectionConfidence = 1.0; // Perfect size - well-framed document
              } else if (areaRatio > 0.45 && areaRatio <= 0.5) {
                detectionConfidence = 0.8; // Large but acceptable
              } else if (areaRatio >= 0.08 && areaRatio < 0.15) {
                detectionConfidence = 0.6; // Small but acceptable - document far from camera
              } else {
                detectionConfidence = 0.5; // Edge cases
              }
            }
          }
        }

        // Step 12: Force confidence to 0 if no valid document found
        // This prevents stale high confidence from previous frames when document disappears
        if (!bestContour || bestContour.length !== 4) {
          detectionConfidence = 0;
        }

        // Step 13: Apply frame voting to stabilize detection
        // Track whether THIS frame found a valid document
        const rawDetectionFound = bestContour !== null && bestContour.length === 4;

        // Add vote to history
        detectionVotes.value.push(rawDetectionFound);
        if (detectionVotes.value.length > VOTE_HISTORY_SIZE) {
          detectionVotes.value.shift();  // Keep only last N frames
        }

        // Count votes: how many recent frames detected a document?
        let votesForDetection = 0;
        for (let i = 0; i < detectionVotes.value.length; i++) {
          if (detectionVotes.value[i]) votesForDetection++;
        }

        // Consensus: require majority of frames to agree
        const hasConsensus = votesForDetection >= VOTE_THRESHOLD;

        // Only enforce voting during initial warmup to prevent false detection starts
        // After warmup, let confidence calculation + EMA smoothing handle stability naturally
        const isWarmingUp = detectionVotes.value.length < VOTE_HISTORY_SIZE;

        if (isWarmingUp && !hasConsensus) {
          detectionConfidence = 0;  // Block detection until warmup complete
        }
        // After warmup, voting is advisory-only (tracked for debugging)
        // Natural confidence calculation + EMA smoothing provide stability

        // Step 13: Apply confidence smoothing to reduce flickering
        // Use exponential moving average: smoothed = α * new + (1-α) * old
        smoothedConfidence.value =
          CONFIDENCE_SMOOTHING * detectionConfidence +
          (1 - CONFIDENCE_SMOOTHING) * smoothedConfidence.value;

        // Update debug value
        smoothedConfidenceDebug.value = smoothedConfidence.value;

        // Step 14: Apply state machine with hysteresis to prevent flickering
        // Uses different enter/exit thresholds to create "stickiness"
        if (detectionState.value === DetectionState.NO_DOCUMENT) {
          // Decrement grace counter if in grace period (prevents immediate re-entry)
          if (postExitGraceCounter.value > 0) {
            postExitGraceCounter.value--;
            stableFrameCount.value = 0;  // Block entry during grace period
          } else {
            // Grace period over, check if we should enter DOCUMENT_DETECTED state
            if (smoothedConfidence.value >= ENTER_THRESHOLD) {
              stableFrameCount.value++;
              if (stableFrameCount.value >= MIN_STABLE_FRAMES) {
                // STATE TRANSITION: NO_DOCUMENT → DOCUMENT_DETECTED
                detectionState.value = DetectionState.DOCUMENT_DETECTED;
                detectionStateDebug.value = 'document_detected';
                const transitionMsg = `entered at conf=${(smoothedConfidence.value * 100).toFixed(1)}% frame=${frameCount.value}`;
                lastStateTransition.value = transitionMsg;
                console.log(`[DocumentDetection] STATE TRANSITION: ${transitionMsg}`);
                stableFrameCount.value = 0;  // Reset after successful transition
              }
            } else {
              // Confidence dropped below enter threshold - reset counter only if we were counting
              if (stableFrameCount.value > 0) {
                stableFrameCount.value = 0;
              }
            }
          }
        } else {
          // Currently showing detection - require low confidence to exit (creates "stickiness")
          if (smoothedConfidence.value < EXIT_THRESHOLD) {
            stableFrameCount.value++;
            if (stableFrameCount.value >= MIN_STABLE_FRAMES) {
              // STATE TRANSITION: DOCUMENT_DETECTED → NO_DOCUMENT
              detectionState.value = DetectionState.NO_DOCUMENT;
              detectionStateDebug.value = 'no_document';
              const transitionMsg = `exited at conf=${(smoothedConfidence.value * 100).toFixed(1)}% frame=${frameCount.value}`;
              lastStateTransition.value = transitionMsg;
              console.log(`[DocumentDetection] STATE TRANSITION: ${transitionMsg}`);
              stableFrameCount.value = 0;  // Reset after successful transition
              postExitGraceCounter.value = POST_EXIT_GRACE_FRAMES;  // Start grace period
            }
          } else {
            // Confidence recovered above exit threshold - reset counter only if we were counting toward exit
            if (stableFrameCount.value > 0) {
              stableFrameCount.value = 0;
            }
          }
        }

        // Update debug counters
        stableFrameCountDebug.value = stableFrameCount.value;
        postExitGraceCounterDebug.value = postExitGraceCounter.value;

        // Step 15: Smooth corner positions to reduce visual jitter
        // Use persistence to prevent corners from disappearing on brief detection failures
        // Also validate corner similarity to prevent shape morphing
        if (bestContour && bestContour.length === 4) {
          // Validate new corners against existing tracked shape (if we're already tracking)
          const shouldAcceptCorners =
            detectionState.value === DetectionState.NO_DOCUMENT || // Always accept when not tracking
            !smoothedCorners.value || // Always accept if no previous corners
            areCornersSimular(bestContour, smoothedCorners.value, 0.15); // Accept if similar (15% tolerance)

          if (shouldAcceptCorners) {
            // Valid corners detected and passed similarity check - update smoothed corners
            smoothedCorners.value = smoothCorners(
              bestContour,
              smoothedCorners.value,
              CORNER_SMOOTHING
            );
            cornerPersistenceCounter.value = CORNER_PERSISTENCE_FRAMES;
          } else {
            // Corners too different from current shape - reject to prevent morphing
            // Treat as if no corners were detected this frame
            if (cornerPersistenceCounter.value > 0) {
              cornerPersistenceCounter.value--;
            } else {
              smoothedCorners.value = null;
            }
          }
        } else {
          // No corners detected this frame
          if (cornerPersistenceCounter.value > 0) {
            // Still in persistence period - keep showing last known corners
            cornerPersistenceCounter.value--;
            // Don't modify smoothedCorners.value - it retains previous value
          } else {
            // Persistence period expired - clear corners
            smoothedCorners.value = null;
          }
        }

        // Step 16: Update shared values with detection results
        processingStep.value = 'complete';
        detectedCorners.value = bestContour;
        confidence.value = smoothedConfidence.value; // Use smoothed confidence

        // Debug: Log final detection result
        if (!bestContour) {
          debugInfo.value = `${debugInfo.value}, no document found`;
        } else {
          debugInfo.value = `${debugInfo.value}, found doc: ${bestContour.length} corners, conf=${(smoothedConfidence.value * 100).toFixed(1)}%`;
        }
      } // End of shouldProcessDetection block

      // CRITICAL: Render camera frame on EVERY frame (not just processed frames)
      // This ensures smooth 30 FPS camera feed display
      // https://react-native-vision-camera.com/docs/guides/skia-frame-processors
      frame.render();
      renderCount.value = renderCount.value + 1;

      // Draw overlay on EVERY frame using last known detection state
      // This eliminates flickering by maintaining consistent overlay at 30 FPS
      // even though detection only updates at 5 FPS
      const stateSnapshot = detectionState.value;

      // Draw document border overlay when in stable DOCUMENT_DETECTED state
      // Uses smoothed corners from last detection pass (cached at 5 FPS, drawn at 30 FPS)
      if (smoothedCorners.value && smoothedCorners.value.length === 4 && stateSnapshot === DetectionState.DOCUMENT_DETECTED) {
        const path = Skia.Path.Make();
        const pointsToShow = [];

        // Corners are in scaled (processing) resolution, scale up to full frame
        // Detection happens at 1/4 scale, so multiply by SCALE_FACTOR to get full coordinates
        const ratio = SCALE_FACTOR; // 4 - multiply to scale UP from 1/4 to full

        // Start path at last point (like blog)
        const lastX = smoothedCorners.value[3].x * ratio;
        const lastY = smoothedCorners.value[3].y * ratio;
        path.moveTo(lastX, lastY);
        pointsToShow.push(vec(lastX, lastY));

        // Draw path through all 4 smoothed corners
        for (let i = 0; i < 4; i++) {
          const pointX = smoothedCorners.value[i].x * ratio;
          const pointY = smoothedCorners.value[i].y * ratio;
          path.lineTo(pointX, pointY);
          pointsToShow.push(vec(pointX, pointY));
        }

        path.close();

        // Draw filled polygon and border on frame
        frame.drawPath(path, paint);
        frame.drawPoints(PointMode.Polygon, pointsToShow, border);

        // Debug: Increment Skia draw counter and clear skip reason
        skiaDrawCount.value = skiaDrawCount.value + 1;
        skiaDrawSkipReason.value = '';
      } else {
        // Track why drawing was skipped for debugging
        let skipReason = '';
        if (!smoothedCorners.value) {
          skipReason = 'no_corners';
        } else if (smoothedCorners.value.length !== 4) {
          skipReason = `wrong_count:${smoothedCorners.value.length}`;
        } else if (stateSnapshot !== DetectionState.DOCUMENT_DETECTED) {
          skipReason = 'state_not_detected';
        } else {
          skipReason = 'unknown';
        }
        skiaDrawSkipReason.value = skipReason;
        // Only log on processed frames to avoid console spam
        if (shouldProcessDetection) {
          console.log(`[DocumentDetection] Skia draw skipped: ${skipReason} (frame ${frameCount.value})`);
        }
      }

    } catch (error) {
        // Log error with context and reset detection state
        // Note: This runs on worklet thread, so we can't directly call logger
        // Instead, log to console which appears in native console (Xcode/Logcat)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stepInfo = processingStep.value;

        // Store error in shared value for UI display
        lastError.value = `${stepInfo}: ${errorMessage}`;

        // Log to console (visible in Xcode console on iOS)
        console.error('[DocumentDetection] Frame processing error:', {
          step: stepInfo,
          error: errorMessage,
          frameNumber: frameCount.value,
        });

        detectedCorners.value = null;
        confidence.value = 0;
        processingStep.value = 'error';

        // Render frame even on error to prevent freeze
        frame.render();
        renderCount.value = renderCount.value + 1;

        // Debug: Increment error counter
        errorCount.value = errorCount.value + 1;
      } finally {
        // Track render timing for debugging
        lastRenderTime.value = Date.now();

        // CRITICAL: Always clear OpenCV buffers (prevents memory leaks)
        try {
          OpenCV.clearBuffers();
          clearBufferCount.value = clearBufferCount.value + 1;
        } catch (clearError) {
          console.error('[DocumentDetection] Error clearing buffers:', clearError);
        }

        // Push updates to React state via runOnJS callbacks
        if (onFrameProcessedJS) {
          onFrameProcessedJS({
            frameCount: frameCount.value,
            renderCount: renderCount.value,
            clearBufferCount: clearBufferCount.value,
            skiaDrawCount: skiaDrawCount.value,
            errorCount: errorCount.value,
            processingStep: processingStep.value,
            debugInfo: debugInfo.value,
            lastRenderTime: lastRenderTime.value,
            lastError: lastError.value,
            // State machine debug data
            detectionState: detectionStateDebug.value,
            stableFrameCount: stableFrameCountDebug.value,
            postExitGraceCounter: postExitGraceCounterDebug.value,
            lastStateTransition: lastStateTransition.value,
            skiaDrawSkipReason: skiaDrawSkipReason.value,
            smoothedConfidence: smoothedConfidenceDebug.value,
          });
        }

        if (onDetectionUpdateJS) {
          // Only send smoothed corners when in stable DOCUMENT_DETECTED state
          // This prevents flickering in the UI and eliminates visual jitter
          const cornersToSend = detectionState.value === DetectionState.DOCUMENT_DETECTED && smoothedCorners.value
            ? smoothedCorners.value.map(c => ({ x: c.x, y: c.y }))
            : null;
          onDetectionUpdateJS(cornersToSend, confidence.value);
        }
      }
  }, [onFrameProcessedJS, onDetectionUpdateJS]);

  return {
    frameProcessor,
    detectedCorners,
    confidence,
    frameCount, // Debug: expose frame count
    lastError, // Debug: expose last error
    processingStep, // Debug: expose current processing step
    debugInfo, // Debug: expose debug info
    // Debug counters for diagnosing freezes
    renderCount,
    clearBufferCount,
    skiaDrawCount,
    errorCount,
    lastRenderTime,
  };
};
