import { useFrameProcessor, runAtTargetFps } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue } from 'react-native-worklets-core';
import {
  OpenCV,
  ObjectType,
  ColorConversionCodes,
  MorphShapes,
  MorphTypes,
  RetrievalModes,
  ContourApproximationModes,
  DataTypes
} from 'react-native-fast-opencv';

export type DocumentCorner = {
  x: number;
  y: number;
};

export type DocumentDetectionResult = {
  corners: DocumentCorner[] | null;
  confidence: number; // 0-1, where 1 is perfect detection
};

/**
 * Custom hook for real-time document edge detection using OpenCV
 *
 * Performance optimizations:
 * - Processes at 1/4 scale (16x faster than full resolution)
 * - Targets 5 FPS processing rate (~200ms per frame)
 * - Uses async processing to avoid blocking camera thread
 *
 * @returns Frame processor and detection result shared values
 */
export const useDocumentDetection = () => {
  const { resize } = useResizePlugin();

  // Shared values for cross-worklet communication (no bridge crossing)
  const detectedCorners = useSharedValue<DocumentCorner[] | null>(null);
  const confidence = useSharedValue<number>(0);
  const frameCount = useSharedValue<number>(0); // Debug: track frame processor execution

  /**
   * Main frame processor for document detection
   * Uses runAtTargetFps to throttle processing to 5 FPS
   */
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    // Process at 5 FPS to balance performance and responsiveness
    // Full camera still runs at 30/60 FPS for smooth preview
    runAtTargetFps(5, () => {
      'worklet';

      // Increment frame counter for debugging
      frameCount.value = frameCount.value + 1;

      try {
        // 1. Calculate scaled dimensions (1/4 resolution for 16x speedup)
        const SCALE_FACTOR = 4;
        const scaledWidth = Math.floor(frame.width / SCALE_FACTOR);
        const scaledHeight = Math.floor(frame.height / SCALE_FACTOR);

        // 2. Resize frame using GPU-accelerated plugin
        // Use BGR format as OpenCV expects BGR by default
        const resizedBuffer = resize(frame, {
          scale: { width: scaledWidth, height: scaledHeight },
          pixelFormat: 'bgr',
          dataType: 'uint8',
        });

        // 3. Convert buffer to OpenCV Mat
        const source = OpenCV.bufferToMat(
          'uint8',      // Data type - MUST be first parameter
          scaledHeight,
          scaledWidth,
          3,            // 3 channels (BGR)
          resizedBuffer
        );

        // 4. Convert to grayscale for edge detection
        OpenCV.invoke('cvtColor', source, source, ColorConversionCodes.COLOR_BGR2GRAY);

        // 5. Create kernels for morphological operations and blurring
        const morphKernel = OpenCV.createObject(ObjectType.Size, 5, 5);
        const blurKernel = OpenCV.createObject(ObjectType.Size, 5, 5);

        // 6. Create structuring element for morphological closing
        // Helps reduce noise and fill small gaps in edges
        const structElement = OpenCV.invoke(
          'getStructuringElement',
          MorphShapes.MORPH_ELLIPSE,
          morphKernel
        );

        // 7. Apply morphological closing (dilate then erode)
        // Removes small dark spots and connects nearby edges
        OpenCV.invoke('morphologyEx', source, source, MorphTypes.MORPH_CLOSE, structElement);

        // 8. Apply Gaussian blur to reduce noise before edge detection
        OpenCV.invoke('GaussianBlur', source, source, blurKernel, 0);

        // 9. Apply Canny edge detection
        // Thresholds: 75 (lower) and 100 (upper)
        // Pixels with gradient > 100 are strong edges
        // Pixels with gradient between 75-100 are weak edges (kept if connected to strong)
        OpenCV.invoke('Canny', source, source, 75, 100);

        // 10. Find contours in the edge-detected image
        const contours = OpenCV.createObject(ObjectType.MatVector);
        OpenCV.invoke(
          'findContours',
          source,
          contours,
          RetrievalModes.RETR_EXTERNAL, // Only external contours (faster)
          ContourApproximationModes.CHAIN_APPROX_SIMPLE // Compress contours (faster)
        );

        // 11. Find the largest quadrilateral contour (likely the document)
        const contoursData = OpenCV.toJSValue(contours);
        let bestContour: DocumentCorner[] | null = null;
        let maxArea = 0;
        let detectionConfidence = 0;

        // Minimum area threshold (scaled to processing resolution)
        // At 1/4 scale: 1000 pixels = 16000 pixels at full resolution
        const MIN_AREA = 1000;

        // Calculate frame area for confidence scoring
        const frameArea = scaledWidth * scaledHeight;

        for (let i = 0; i < contoursData.array.length; i++) {
          const contour = OpenCV.copyObjectFromVector(contours, i);
          const { value: area } = OpenCV.invoke('contourArea', contour, false);

          // Filter out small contours
          if (area > MIN_AREA) {
            // Get perimeter for polygon approximation
            const { value: perimeter } = OpenCV.invoke('arcLength', contour, true);

            // Approximate contour to polygon
            // Epsilon = 2% of perimeter (controls approximation accuracy)
            const approx = OpenCV.createObject(ObjectType.MatVector);
            OpenCV.invoke('approxPolyDP', contour, approx, 0.02 * perimeter, true);

            const approxData = OpenCV.toJSValue(approx);

            // Check if polygon has exactly 4 corners (quadrilateral)
            if (approxData.array.length === 4 && area > maxArea) {
              maxArea = area;

              // Scale corners back to original frame resolution
              bestContour = approxData.array.map((point: any) => ({
                x: point.x * SCALE_FACTOR,
                y: point.y * SCALE_FACTOR,
              }));

              // Calculate confidence score (0-1)
              // Based on area coverage and shape quality
              const areaRatio = area / frameArea;

              // Good document detection: covers 10-80% of frame
              if (areaRatio > 0.1 && areaRatio < 0.8) {
                detectionConfidence = Math.min(areaRatio * 5, 1); // Scale to 0-1
              } else if (areaRatio >= 0.8) {
                detectionConfidence = 0.8; // Too large, might be frame edge
              } else {
                detectionConfidence = areaRatio * 3; // Small document, lower confidence
              }
            }
          }
        }

        // 12. Update shared values with detection results
        detectedCorners.value = bestContour;
        confidence.value = detectionConfidence;

      } catch (error) {
        // Log error with context and reset detection state
        // Note: This runs on worklet thread, so we can't directly call logger
        // Instead, log to console which appears in native console (Xcode/Logcat)
        console.error('[DocumentDetection] Frame processing error:', error);
        detectedCorners.value = null;
        confidence.value = 0;
      } finally {
        // CRITICAL: Clear OpenCV buffers to prevent memory leaks
        // Must be called after every frame, even if error occurred
        OpenCV.clearBuffers();
      }
    });
  }, []);

  return {
    frameProcessor,
    detectedCorners,
    confidence,
    frameCount, // Debug: expose frame count
  };
};
