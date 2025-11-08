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
  const lastError = useSharedValue<string | null>(null); // Debug: track last error message
  const processingStep = useSharedValue<string>('idle'); // Debug: track current processing step
  const debugInfo = useSharedValue<string>(''); // Debug: additional info about detection

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
      lastError.value = null;

      try {
        // Step 1: Calculate scaled dimensions (1/4 resolution for 16x speedup)
        processingStep.value = 'calculating_dimensions';
        const SCALE_FACTOR = 4;
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

        // Step 5: Create kernels for morphological operations and blurring
        processingStep.value = 'creating_kernels';
        const morphKernel = OpenCV.createObject(ObjectType.Size, 5, 5);
        const blurKernel = OpenCV.createObject(ObjectType.Size, 5, 5);

        // Step 6: Create structuring element for morphological closing
        // Helps reduce noise and fill small gaps in edges
        processingStep.value = 'creating_structuring_element';
        const structElement = OpenCV.invoke(
          'getStructuringElement',
          MorphShapes.MORPH_ELLIPSE,
          morphKernel
        );

        if (!structElement) {
          throw new Error('Failed to create structuring element');
        }

        // Step 7: Apply Gaussian blur to reduce noise before edge detection
        processingStep.value = 'applying_blur';
        OpenCV.invoke('GaussianBlur', source, source, blurKernel, 0);

        // Step 8: Apply Canny edge detection with LOWER thresholds for low-light conditions
        // Optimized for detecting edges in poor lighting without flash
        // Thresholds: 30 (lower) and 90 (upper) - more sensitive than previous 50/150
        // This allows detection of subtle document edges even in low contrast situations
        // Pixels with gradient > 90 are strong edges
        // Pixels with gradient between 30-90 are weak edges (kept if connected to strong)
        processingStep.value = 'applying_canny';
        OpenCV.invoke('Canny', source, source, 30, 90);

        // Step 9: Apply morphological closing AFTER edge detection to connect fragmented edges
        // This helps connect broken document edges into continuous contours
        processingStep.value = 'applying_morphology';
        OpenCV.invoke('morphologyEx', source, source, MorphTypes.MORPH_CLOSE, structElement);

        // Step 10: Find contours in the edge-detected image
        processingStep.value = 'finding_contours';
        const contours = OpenCV.createObject(ObjectType.MatVector);
        OpenCV.invoke(
          'findContours',
          source,
          contours,
          RetrievalModes.RETR_EXTERNAL, // Only external contours (faster)
          ContourApproximationModes.CHAIN_APPROX_SIMPLE // Compress contours (faster)
        );

        if (!contours) {
          throw new Error('Failed to create contours MatVector');
        }

        // Step 11: Find the largest quadrilateral contour (likely the document)
        processingStep.value = 'processing_contours';
        const contoursData = OpenCV.toJSValue(contours);
        let bestContour: DocumentCorner[] | null = null;
        let maxArea = 0;
        let detectionConfidence = 0;

        // Minimum area threshold (scaled to processing resolution)
        // At 1/4 scale: 300 pixels = 4800 pixels at full resolution
        // Lowered because edges may be fragmented, requiring multiple contours to be considered
        const MIN_AREA = 300;

        // Calculate frame area for confidence scoring
        const frameArea = scaledWidth * scaledHeight;

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
            
            // Get perimeter for polygon approximation
            const { value: perimeter } = OpenCV.invoke('arcLength', contour, true);

            // Approximate contour to polygon using approxPolyDP (official example approach)
            // This properly approximates contours to polygons and returns actual corner points
            processingStep.value = 'approximating_contour';
            let approxData: any = null;
            
            try {
              // Create PointVector for approxPolyDP output (not MatVector!)
              // According to official example: approxPolyDP(contour, approx, epsilon, closed)
              const approx = OpenCV.createObject(ObjectType.PointVector);
              
              // Epsilon = 2% of perimeter (controls approximation accuracy)
              // Smaller epsilon = more accurate but more points
              // Larger epsilon = less accurate but fewer points
              const epsilon = 0.02 * perimeter;
              
              // Call approxPolyDP: approximates contour to polygon
              OpenCV.invoke('approxPolyDP', contour, approx, epsilon, true);
              
              // Convert PointVector to JS value (this works correctly with PointVector)
              const approxResult = OpenCV.toJSValue(approx);
              
              // Check if we got valid approximation data
              if (approxResult && (approxResult as any).array) {
                const points = (approxResult as any).array as any[];
                const pointCount = points.length;
                debugInfo.value = `${debugInfo.value}, approx=${pointCount}pts`;
                
                // Check if polygon has exactly 4 corners (quadrilateral - likely a document)
                if (pointCount === 4) {
                  approxData = approxResult;
                  debugInfo.value = `${debugInfo.value}, ✓4pts`;
                } else if (pointCount > 4) {
                  // If we have more than 4 points, extract the 4 extreme points
                  // This handles cases where the approximation gives us more corners
                  let topLeft: any = points[0];
                  let topRight: any = points[0];
                  let bottomRight: any = points[0];
                  let bottomLeft: any = points[0];

                  for (let j = 0; j < points.length; j++) {
                    const p: any = points[j];
                    const sum = p.x + p.y;
                    const diff = p.x - p.y;

                    // Find extreme points (corners of bounding box)
                    if (sum < (topLeft.x + topLeft.y)) topLeft = p;
                    if (diff > (topRight.x - topRight.y)) topRight = p;
                    if (sum > (bottomRight.x + bottomRight.y)) bottomRight = p;
                    if (diff < (bottomLeft.x - bottomLeft.y)) bottomLeft = p;
                  }

                  approxData = {
                    array: [topLeft, topRight, bottomRight, bottomLeft]
                  };
                  debugInfo.value = `${debugInfo.value}, ✓extracted4`;
                } else {
                  // Less than 4 points - not a valid quadrilateral
                  debugInfo.value = `${debugInfo.value}, tooFewPoints`;
                  continue;
                }
              } else {
                debugInfo.value = `${debugInfo.value}, approxInvalid`;
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

            // Check if we have valid approximation with 4 corners
            if (!approxData || !approxData.array || approxData.array.length !== 4) {
              // Debug: Log why contour was skipped
              const pointCount = approxData?.array?.length || 0;
              debugInfo.value = `${debugInfo.value}, skipped: ${pointCount} points (need 4)`;
              continue; // Skip this contour
            }

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

        // Step 12: Update shared values with detection results
        processingStep.value = 'complete';
        detectedCorners.value = bestContour;
        confidence.value = detectionConfidence;
        
        // Debug: Log final detection result
        if (!bestContour) {
          debugInfo.value = `${debugInfo.value}, no document found`;
        } else {
          debugInfo.value = `${debugInfo.value}, found doc: ${bestContour.length} corners, conf=${(detectionConfidence * 100).toFixed(1)}%`;
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
      } finally {
        // CRITICAL: Clear OpenCV buffers to prevent memory leaks
        // Must be called after every frame, even if error occurred
        try {
          OpenCV.clearBuffers();
        } catch (clearError) {
          console.error('[DocumentDetection] Error clearing buffers:', clearError);
        }
      }
    });
  }, []);

  return {
    frameProcessor,
    detectedCorners,
    confidence,
    frameCount, // Debug: expose frame count
    lastError, // Debug: expose last error
    processingStep, // Debug: expose current processing step
    debugInfo, // Debug: expose debug info
  };
};
