import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateLeft, faCheck } from '@fortawesome/pro-regular-svg-icons';
import Svg, { Line } from 'react-native-svg';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';
import { logger } from '@/lib/logger';
import { usePostCaptureDebug } from '@/hooks/usePostCaptureDebug';
import { useAnalytics } from '@/lib/analytics';
// import CornerHandle from './CornerHandle'; // Temporarily disabled

type PostCapturePreviewProps = {
  imageBase64: string;
  detectedCorners: DocumentCorner[] | null;
  onAccept: (corners: DocumentCorner[]) => void;
  onRetake: () => void;
  isProcessing?: boolean;
  stabilityProgress?: number; // For showing auto-capture progress
};

/**
 * Post-capture preview component
 * Shows captured image with adjustable document corners
 */
const PostCapturePreview = ({
  imageBase64,
  detectedCorners,
  onAccept,
  onRetake,
  isProcessing = false,
  stabilityProgress = 0,
}: PostCapturePreviewProps) => {
  // Log component mount (critical lifecycle event)
  useEffect(() => {
    // Add breadcrumb for component lifecycle
    Sentry.addBreadcrumb({
      message: 'PostCapturePreview mounting',
      category: 'component',
      level: 'info',
      data: {
        hasImageBase64: !!imageBase64,
        imageBase64Length: imageBase64?.length || 0,
        hasDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
        detectedCornersCount: detectedCorners?.length || 0,
      },
    });

    logger.info('[PostCapturePreview] Component mounting', {
      screen: 'post_capture_preview',
      action: 'component_mount',
      hasImageBase64: !!imageBase64,
      imageBase64Length: imageBase64?.length || 0,
      hasDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
      detectedCornersCount: detectedCorners?.length || 0,
    });

    // Validate props on mount
    if (!imageBase64) {
      logger.error('[PostCapturePreview] Missing imageBase64 on mount', {
        screen: 'post_capture_preview',
        action: 'validation_error',
      });
      Sentry.captureMessage('PostCapturePreview mounted without imageBase64', 'warning');
    }

    // Track in PostHog
    if ((global as any).posthog) {
      (global as any).posthog.capture('post_capture_preview_mounted', {
        has_image: !!imageBase64,
        has_corners: !!detectedCorners,
        corners_count: detectedCorners?.length || 0,
        image_size: imageBase64?.length || 0,
      });
    }

    return () => {
      Sentry.addBreadcrumb({
        message: 'PostCapturePreview unmounting',
        category: 'component',
        level: 'info',
      });

      logger.info('[PostCapturePreview] Component unmounting', {
        screen: 'post_capture_preview',
        action: 'component_unmount',
      });
    };
  }, []);

  // Debug state for tracking rendering pipeline (only in preview builds)
  const { debugState, dispatch } = usePostCaptureDebug(
    process.env.EXPO_PUBLIC_SHOW_DEBUG_PANELS === 'true'
  );

  // Initialize corners from detected or default to normalized coordinates (0-1)
  // This runs during component initialization - wrap in try-catch to catch crashes
  const [corners, setCorners] = useState<DocumentCorner[]>(() => {
    try {
      logger.info('[PostCapturePreview] Initializing corners state', {
        screen: 'post_capture_preview',
        action: 'corners_init_start',
        hasDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
        detectedCorners: detectedCorners,
        hasImageBase64: !!imageBase64,
        imageBase64Length: imageBase64?.length || 0,
      });

      // Validate detectedCorners before using
      let initialCorners: DocumentCorner[];
      if (detectedCorners && detectedCorners.length === 4) {
        // Validate all corners are valid numbers
        const isValid = detectedCorners.every(c => 
          typeof c.x === 'number' && 
          typeof c.y === 'number' && 
          isFinite(c.x) && 
          isFinite(c.y)
        );
        
        if (isValid) {
          initialCorners = detectedCorners;
        } else {
          logger.warn('[PostCapturePreview] Invalid detectedCorners, using defaults', {
            screen: 'post_capture_preview',
            action: 'corners_validation_failed',
            detectedCorners,
          });
          initialCorners = [
            { x: 0.15, y: 0.15 }, // Top-left - 15% inset from edges
            { x: 0.85, y: 0.15 }, // Top-right
            { x: 0.85, y: 0.85 }, // Bottom-right
            { x: 0.15, y: 0.85 }, // Bottom-left
          ];
        }
      } else {
        initialCorners = [
          { x: 0.15, y: 0.15 }, // Top-left - 15% inset from edges
          { x: 0.85, y: 0.15 }, // Top-right
          { x: 0.85, y: 0.85 }, // Bottom-right
          { x: 0.15, y: 0.85 }, // Bottom-left
        ];
      }

      logger.info('[PostCapturePreview] Component initialized', {
        screen: 'post_capture_preview',
        action: 'corners_init_success',
        hasDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
        detectedCorners: detectedCorners,
        initialCorners,
        hasImageBase64: !!imageBase64,
        imageBase64Length: imageBase64?.length || 0,
      });

      return initialCorners;
    } catch (error) {
      logger.error('[PostCapturePreview] Error initializing corners state', {
        screen: 'post_capture_preview',
        action: 'corners_init_error',
        hasDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
        hasImageBase64: !!imageBase64,
      }, error instanceof Error ? error : new Error(String(error)));
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: {
          screen: 'post_capture_preview',
          action: 'corners_init_error',
        },
      });
      // Return safe defaults
      return [
        { x: 0.15, y: 0.15 },
        { x: 0.85, y: 0.15 },
        { x: 0.85, y: 0.85 },
        { x: 0.15, y: 0.85 },
      ];
    }
  });

  // Dispatch component init after mount
  useEffect(() => {
    dispatch({
      type: 'COMPONENT_INIT',
      payload: {
        hasImageBase64: !!imageBase64,
        imageBase64Length: imageBase64?.length || 0,
        hasDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
        detectedCornersCount: detectedCorners?.length || 0,
      },
    });
  }, [dispatch, imageBase64, detectedCorners]);

  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [displayBounds, setDisplayBounds] = useState({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0
  });

  // Calculate display bounds accounting for resizeMode="contain"
  // Moved before handleImageLoad to avoid dependency issues
  const calculateAndSetDisplayBounds = useCallback((containerWidth: number, containerHeight: number, imageWidth?: number, imageHeight?: number) => {
    // Use provided image dimensions or fall back to state
    const imgWidth = imageWidth ?? imageDimensions.width;
    const imgHeight = imageHeight ?? imageDimensions.height;

    // Can't calculate display bounds until we have both container and image dimensions
    if (imgWidth === 0 || imgHeight === 0) {
      dispatch({ type: 'DISPLAY_BOUNDS_FAILED' });

      logger.warn('[PostCapturePreview] Cannot calculate display bounds - image dimensions not ready', {
        screen: 'post_capture_preview',
        imageDimensionsWidth: imgWidth,
        imageDimensionsHeight: imgHeight,
      });
      return;
    }
    if (containerWidth === 0 || containerHeight === 0) {
      dispatch({ type: 'DISPLAY_BOUNDS_FAILED' });

      logger.warn('[PostCapturePreview] Cannot calculate display bounds - container dimensions zero', {
        screen: 'post_capture_preview',
        containerWidth,
        containerHeight,
      });
      return;
    }

    // Calculate actual displayed image bounds accounting for resizeMode="contain"
    const imageRatio = imgWidth / imgHeight;
    const containerRatio = containerWidth / containerHeight;

    let displayedWidth, displayedHeight, offsetX, offsetY;

    if (imageRatio > containerRatio) {
      // Image is wider - constrained by container width
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imageRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayedHeight) / 2;
    } else {
      // Image is taller - constrained by container height
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imageRatio;
      offsetX = (containerWidth - displayedWidth) / 2;
      offsetY = 0;
    }

    dispatch({
      type: 'DISPLAY_BOUNDS_CALCULATED',
      payload: {
        imageRatio,
        containerRatio,
        displayWidth: displayedWidth,
        displayHeight: displayedHeight,
        displayOffsetX: offsetX,
        displayOffsetY: offsetY,
      },
    });

    logger.info('[PostCapturePreview] Display bounds calculated', {
      screen: 'post_capture_preview',
      imageRatio,
      containerRatio,
      displayedWidth,
      displayedHeight,
      offsetX,
      offsetY,
    });

    setDisplayBounds({ width: displayedWidth, height: displayedHeight, offsetX, offsetY });

    // Transform normalized corners (0-1) to screen coordinates
    // Use detectedCorners if available, otherwise use default normalized coordinates
    const cornersToScale = (detectedCorners && detectedCorners.length === 4)
      ? detectedCorners
      : [
          { x: 0.15, y: 0.15 }, // Top-left - 15% inset from edges
          { x: 0.85, y: 0.15 }, // Top-right
          { x: 0.85, y: 0.85 }, // Bottom-right
          { x: 0.15, y: 0.85 }, // Bottom-left
        ];

    logger.debug('[PostCapturePreview] Corners before scaling', {
      screen: 'post_capture_preview',
      cornersToScale,
      usingDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
    });

    // Scale to displayed image dimensions and add offsets
    const scaledCorners = cornersToScale.map(corner => ({
      x: corner.x * displayedWidth + offsetX,
      y: corner.y * displayedHeight + offsetY,
    }));

    dispatch({
      type: 'CORNERS_SCALED',
      payload: { count: scaledCorners.length },
    });

    logger.info('[PostCapturePreview] Corners after scaling', {
      screen: 'post_capture_preview',
      scaledCorners,
    });

    setCorners(scaledCorners);
  }, [imageDimensions.width, imageDimensions.height, detectedCorners, dispatch]);

  // Handle image load to get actual dimensions
  // Using onLoad instead of Image.getSize() to avoid race condition
  // expo-image provides dimensions in event.source instead of event.nativeEvent.source
  const handleImageLoad = useCallback((event: any) => {
    try {
      const { width, height } = event.source;

      logger.info('[PostCapturePreview] Image loaded with dimensions', {
        screen: 'post_capture_preview',
        action: 'image_load',
        width,
        height,
        hasWidth: !!width,
        hasHeight: !!height,
      });

      if (width && height) {
        dispatch({
          type: 'IMAGE_DIMENSIONS_RECEIVED',
          payload: { width, height },
        });

        setImageDimensions({ width, height });

        // Recalculate display bounds if container is ready
        if (containerDimensions.width > 0 && containerDimensions.height > 0) {
          logger.info('[PostCapturePreview] Image loaded, recalculating display bounds', {
            screen: 'post_capture_preview',
            action: 'recalculate_bounds',
            imageDimensions: { width, height },
            containerDimensions,
          });
          // Pass image dimensions directly to avoid waiting for state update
          calculateAndSetDisplayBounds(containerDimensions.width, containerDimensions.height, width, height);
        }
      } else {
        logger.warn('[PostCapturePreview] Image loaded but missing dimensions', {
          screen: 'post_capture_preview',
          action: 'image_load_incomplete',
          event: event,
        });
        dispatch({ type: 'IMAGE_DIMENSIONS_FAILED' });
      }
    } catch (error) {
      logger.error('[PostCapturePreview] Error in handleImageLoad', {
        screen: 'post_capture_preview',
        action: 'image_load_error',
      }, error as Error);

      dispatch({ type: 'IMAGE_DIMENSIONS_FAILED' });

      Sentry.captureException(error, {
        tags: {
          screen: 'post_capture_preview',
          action: 'image_load_error',
        },
      });
    }
  }, [containerDimensions, calculateAndSetDisplayBounds, dispatch]);

  // Recalculate display bounds when image dimensions change
  // This useEffect is now triggered by onLoad instead of Image.getSize
  useEffect(() => {
    if (imageDimensions.width > 0 && imageDimensions.height > 0 &&
        containerDimensions.width > 0 && containerDimensions.height > 0) {
      logger.info('[PostCapturePreview] Image dimensions received, recalculating display bounds', {
        screen: 'post_capture_preview',
        imageDimensions,
        containerDimensions,
      });
      calculateAndSetDisplayBounds(containerDimensions.width, containerDimensions.height);
    }
  }, [imageDimensions.width, imageDimensions.height, containerDimensions.width, containerDimensions.height, calculateAndSetDisplayBounds]);

  // Track SVG lines rendering state
  useEffect(() => {
    if (corners.length === 4 && displayBounds.width > 0) {
      dispatch({
        type: 'SVG_LINES_RENDERING',
        payload: { rendering: true, lineCount: 4 },
      });
    } else {
      dispatch({
        type: 'SVG_LINES_RENDERING',
        payload: { rendering: false, lineCount: 0 },
      });
    }
  }, [corners.length, displayBounds.width, dispatch]);

  // Track overlay rendering state
  useEffect(() => {
    if (displayBounds.width > 0) {
      logger.info('[PostCapturePreview] Overlay ready to render', {
        screen: 'post_capture_preview',
        overlayLeft: displayBounds.offsetX,
        overlayTop: displayBounds.offsetY,
        overlayWidth: displayBounds.width,
        overlayHeight: displayBounds.height,
        cornersCount: corners.length,
      });
      dispatch({
        type: 'OVERLAY_RENDERING',
        payload: { rendering: true, cornerHandleCount: corners.length },
      });
    } else {
      logger.debug('[PostCapturePreview] Overlay not ready - displayBounds.width is 0', {
        screen: 'post_capture_preview',
        displayBounds,
      });
      dispatch({
        type: 'OVERLAY_RENDERING',
        payload: { rendering: false, cornerHandleCount: 0 },
      });
    }
  }, [displayBounds.width, displayBounds.height, displayBounds.offsetX, displayBounds.offsetY, corners.length, dispatch]);

  const handleCornerChange = (index: number, position: CornerPosition) => {
    const newCorners = [...corners];
    newCorners[index] = position;
    setCorners(newCorners);
  };

  const handleImageLayout = useCallback((event: any) => {
    const { width: containerWidth, height: containerHeight, x, y } = event.nativeEvent.layout;

    // Only log if dimensions actually changed to reduce noise
    if (containerWidth !== containerDimensions.width || containerHeight !== containerDimensions.height) {
      logger.debug('[PostCapturePreview] handleImageLayout called', {
        screen: 'post_capture_preview',
        containerWidth,
        containerHeight,
        x,
        y,
        imageDimensionsWidth: imageDimensions.width,
        imageDimensionsHeight: imageDimensions.height,
      });
    }

    dispatch({
      type: 'LAYOUT_UPDATED',
      payload: { containerWidth, containerHeight },
    });

    // Store container dimensions for later recalculation when image dimensions arrive
    setContainerDimensions({ width: containerWidth, height: containerHeight });

    // Try to calculate display bounds (will return early if image dimensions not ready)
    calculateAndSetDisplayBounds(containerWidth, containerHeight);
  }, [containerDimensions.width, containerDimensions.height, imageDimensions.width, imageDimensions.height, calculateAndSetDisplayBounds, dispatch]);

  const handleAccept = () => {
    // Convert screen coordinates back to normalized (0-1) for processing
    if (displayBounds.width === 0 || displayBounds.height === 0) {
      // Fallback if display bounds not calculated yet
      onAccept(corners);
      return;
    }

    const normalizedCorners = corners.map(corner => ({
      x: (corner.x - displayBounds.offsetX) / displayBounds.width,
      y: (corner.y - displayBounds.offsetY) / displayBounds.height,
    }));

    onAccept(normalizedCorners);
  };

  // Draw connecting lines between corners
  const renderBorderLines = () => {
    logger.debug('[PostCapturePreview] renderBorderLines called', {
      screen: 'post_capture_preview',
      cornersLength: corners.length,
      displayBoundsWidth: displayBounds.width,
    });

    if (corners.length !== 4) {
      logger.warn('[PostCapturePreview] Cannot render border lines - need 4 corners', {
        screen: 'post_capture_preview',
        cornersLength: corners.length,
      });
      return null;
    }

    // Safety checks: Validate display bounds
    if (!displayBounds.width || !displayBounds.height || 
        displayBounds.width <= 0 || displayBounds.height <= 0 ||
        !isFinite(displayBounds.width) || !isFinite(displayBounds.height)) {
      logger.warn('[PostCapturePreview] Cannot render border lines - invalid display bounds', {
        screen: 'post_capture_preview',
        displayBounds,
      });
      return null;
    }

    // Safety check: Don't render if corners are still in normalized coordinates (0-1 range)
    if (!corners.every(c => c.x > 1 && c.y > 1)) {
      logger.warn('[PostCapturePreview] Cannot render border lines - corners not yet scaled to screen coordinates', {
        screen: 'post_capture_preview',
        corners,
      });
      return null;
    }

    // Safety check: Validate corner coordinates are finite numbers
    if (!corners.every(c => isFinite(c.x) && isFinite(c.y))) {
      logger.warn('[PostCapturePreview] Cannot render border lines - invalid corner coordinates', {
        screen: 'post_capture_preview',
        corners,
      });
      return null;
    }

    const lines = corners.map((corner, index) => {
      const nextCorner = corners[(index + 1) % 4];
      // Convert absolute screen coordinates to overlay-relative coordinates
      const x1 = corner.x - displayBounds.offsetX;
      const y1 = corner.y - displayBounds.offsetY;
      const x2 = nextCorner.x - displayBounds.offsetX;
      const y2 = nextCorner.y - displayBounds.offsetY;

      // Validate SVG coordinates are finite numbers
      if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
        logger.warn(`[PostCapturePreview] Invalid SVG coordinates for line ${index}`, {
          screen: 'post_capture_preview',
          index,
          x1,
          y1,
          x2,
          y2,
          corner,
          nextCorner,
          displayBounds,
        });
        return null;
      }

      logger.debug(`[PostCapturePreview] Border line ${index}`, {
        screen: 'post_capture_preview',
        index,
        x1,
        y1,
        x2,
        y2,
      });

      // Log right before creating SVG Line (potential crash point)
      logger.debug(`[PostCapturePreview] Creating SVG Line ${index}`, {
        screen: 'post_capture_preview',
        action: 'svg_line_create',
        index,
        x1,
        y1,
        x2,
        y2,
      });

      return (
        <Line
          key={`line-${index}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#00FF00"
          strokeWidth="3"
        />
      );
    }).filter(Boolean); // Filter out null entries

    logger.info('[PostCapturePreview] Rendering SVG border lines', {
      screen: 'post_capture_preview',
      lineCount: lines.length,
      svgWidth: displayBounds.width,
      svgHeight: displayBounds.height,
    });

    // Log right before creating SVG component (potential crash point)
    logger.info('[PostCapturePreview] Creating SVG component', {
      screen: 'post_capture_preview',
      action: 'svg_component_create',
      width: displayBounds.width,
      height: displayBounds.height,
      lineCount: lines.length,
    });

    try {
      return (
        <Svg
          style={StyleSheet.absoluteFill}
          width={displayBounds.width}
          height={displayBounds.height}
        >
          {lines}
        </Svg>
      );
    } catch (error) {
      logger.error('[PostCapturePreview] Error creating SVG component', {
        screen: 'post_capture_preview',
        action: 'svg_component_error',
        width: displayBounds.width,
        height: displayBounds.height,
        lineCount: lines.length,
      }, error instanceof Error ? error : new Error(String(error)));
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: {
          screen: 'post_capture_preview',
          action: 'svg_component_error',
        },
      });
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Adjust Document Corners</Text>
          <Text style={styles.subtitle}>
            Drag the corners to match the document edges
          </Text>
          {stabilityProgress > 0 && stabilityProgress < 1 && (
            <Text style={styles.stabilityText}>
              Auto-captured at {Math.round(stabilityProgress * 100)}% stability
            </Text>
          )}
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
            style={styles.image}
            contentFit="contain"
            onLayout={handleImageLayout}
            onLoad={handleImageLoad}
          />

          {/* Overlay with corner handles and border - positioned to match actual image bounds */}
          {displayBounds.width > 0 && 
           displayBounds.height > 0 &&
           isFinite(displayBounds.width) && 
           isFinite(displayBounds.height) &&
           isFinite(displayBounds.offsetX) &&
           isFinite(displayBounds.offsetY) && (() => {
            // Log right before rendering overlay (critical crash point)
            logger.info('[PostCapturePreview] Rendering overlay', {
              screen: 'post_capture_preview',
              action: 'overlay_render_start',
              displayBounds,
              cornersCount: corners.length,
              corners: corners.map(c => ({ x: c.x, y: c.y })),
            });

            return (
                <View
                  style={{
                    position: 'absolute',
                    left: displayBounds.offsetX,
                    top: displayBounds.offsetY,
                    width: displayBounds.width,
                    height: displayBounds.height,
                  }}
                  pointerEvents="box-none"
                >
                  {/* Border lines */}
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    {(() => {
                      logger.debug('[PostCapturePreview] Rendering border lines', {
                        screen: 'post_capture_preview',
                        action: 'border_lines_render',
                      });
                      return renderBorderLines();
                    })()}
                  </View>

                  {/* Corner handles - only render when corners are properly scaled to screen coordinates */}
                  {(() => {
                    // Strict validation: corners must be scaled (x > 1, y > 1) and all values finite
                    const areCornersScaled = corners.length === 4 && 
                      corners.every(c => 
                        c.x > 1 && 
                        c.y > 1 && 
                        isFinite(c.x) && 
                        isFinite(c.y) &&
                        c.x < 10000 && // Reasonable upper bound
                        c.y < 10000
                      );

                    if (!areCornersScaled) {
                      // Don't log on every render - only log once when we detect the issue
                      if (corners.length > 0) {
                        logger.debug('[PostCapturePreview] Corners not yet scaled, skipping handle render', {
                          screen: 'post_capture_preview',
                          cornersLength: corners.length,
                          corners,
                          displayBoundsWidth: displayBounds.width,
                          displayBoundsHeight: displayBounds.height,
                        });
                      }
                      return null;
                    }

                    // Temporarily disabled - CornerHandle causing crashes
                    return null;

                    // return corners.map((corner, index) => {
                    //   const handlePosition = {
                    //     x: corner.x - displayBounds.offsetX,
                    //     y: corner.y - displayBounds.offsetY,
                    //   };

                    //   // Validate handle position before rendering
                    //   if (!isFinite(handlePosition.x) || !isFinite(handlePosition.y) ||
                    //       handlePosition.x < 0 || handlePosition.y < 0 ||
                    //       handlePosition.x > displayBounds.width || handlePosition.y > displayBounds.height) {
                    //     logger.warn(`[PostCapturePreview] Invalid handle position for corner ${index}`, {
                    //       screen: 'post_capture_preview',
                    //       index,
                    //       corner,
                    //       handlePosition,
                    //       displayBounds,
                    //     });
                    //     return null;
                    //   }

                    //   logger.debug(`[PostCapturePreview] Rendering corner handle ${index}`, {
                    //     screen: 'post_capture_preview',
                    //     index,
                    //     cornerX: corner.x,
                    //     cornerY: corner.y,
                    //     handlePositionX: handlePosition.x,
                    //     handlePositionY: handlePosition.y,
                    //   });

                    //   return (
                    //     <CornerHandle
                    //       key={`corner-${index}`}
                    //       position={handlePosition}
                    //       onPositionChange={(pos) => handleCornerChange(index, {
                    //         x: pos.x + displayBounds.offsetX,
                    //         y: pos.y + displayBounds.offsetY,
                    //       })}
                    //       cornerIndex={index}
                    //       imageWidth={displayBounds.width}
                    //       imageHeight={displayBounds.height}
                    //     />
                    //   );
                    // }).filter(Boolean);
                  })()}
                </View>
            );
          })()}

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#00FF00" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <SquishyPressable
            onPress={onRetake}
            style={styles.retakeButton}
            disabled={isProcessing}
          >
            <FontAwesomeIcon icon={faRotateLeft} size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Retake</Text>
          </SquishyPressable>

          <SquishyPressable
            onPress={handleAccept}
            style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
            disabled={isProcessing}
          >
            <FontAwesomeIcon icon={faCheck} size={24} color="#000000" />
            <Text style={[styles.buttonText, styles.acceptButtonText]}>
              Accept
            </Text>
          </SquishyPressable>
        </View>

        {/* Debug panel - only shown when EXPO_PUBLIC_SHOW_DEBUG_PANELS is enabled (preview builds) */}
        {(process.env.EXPO_PUBLIC_SHOW_DEBUG_PANELS === 'true') && debugState && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugPanelText}>📊 Post-Capture Debug</Text>
            <Text style={styles.debugPanelText}>
              Init: {debugState.componentInitialized ? '✅' : '❌'}
            </Text>
            <Text style={styles.debugPanelText}>
              ImageBase64: {debugState.hasImageBase64 ? '✅' : '❌'} ({(debugState.imageBase64Length / 1024).toFixed(0)}KB)
            </Text>
            <Text style={styles.debugPanelText}>
              Detected Corners: {debugState.hasDetectedCorners ? `✅ (${debugState.detectedCornersCount} pts)` : '❌'}
            </Text>
            <Text style={styles.debugPanelText}>--- Dimensions ---</Text>
            <Text style={styles.debugPanelText}>
              Image: {debugState.imageDimensionsReceived ? `${debugState.imageWidth}x${debugState.imageHeight}` : 'pending...'}
            </Text>
            <Text style={styles.debugPanelText}>
              Container: {debugState.containerWidth}x{debugState.containerHeight}
            </Text>
            <Text style={styles.debugPanelText}>
              Ratios: Img={debugState.imageRatio.toFixed(2)} | Cont={debugState.containerRatio.toFixed(2)}
            </Text>
            <Text style={styles.debugPanelText}>--- Display Bounds ---</Text>
            <Text style={[styles.debugPanelText, { fontWeight: 'bold', color: debugState.displayBoundsCalculated ? '#00FF00' : '#FF6600' }]}>
              Calculated: {debugState.displayBoundsCalculated ? '✅' : '❌'}
            </Text>
            <Text style={styles.debugPanelText}>
              Size: {debugState.displayWidth.toFixed(0)}x{debugState.displayHeight.toFixed(0)}
            </Text>
            <Text style={styles.debugPanelText}>
              Offset: X={debugState.displayOffsetX.toFixed(0)} | Y={debugState.displayOffsetY.toFixed(0)}
            </Text>
            <Text style={styles.debugPanelText}>--- Rendering ---</Text>
            <Text style={styles.debugPanelText}>
              Scaled Corners: {debugState.scaledCornersCount} pts
            </Text>
            <Text style={[styles.debugPanelText, { fontWeight: 'bold', color: debugState.overlayRendering ? '#00FF00' : '#FFA500' }]}>
              Overlay: {debugState.overlayRendering ? '✅ RENDERING' : '❌ NOT RENDERING'}
            </Text>
            <Text style={styles.debugPanelText}>
              SVG Lines: {debugState.svgLinesRendering ? `✅ (${debugState.svgLineCount})` : '❌'}
            </Text>
            <Text style={styles.debugPanelText}>
              Handles: {debugState.cornerHandlesRendering ? `✅ (${debugState.cornerHandleCount})` : '❌'}
            </Text>
            <Text style={styles.debugPanelText}>
              Last Update: {debugState.lastLayoutUpdate || 'never'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter18pt-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter18pt-Regular',
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 4,
  },
  stabilityText: {
    fontSize: 12,
    fontFamily: 'Inter18pt-Regular',
    color: '#00FF00',
    textAlign: 'center',
    marginTop: 8,
  },
  imageContainer: {
    flex: 1,
    margin: 16,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cornerHandle: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerHandleInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    borderWidth: 2,
    borderColor: '#00FF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerHandleCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF00',
  },
  cornerLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    fontFamily: 'Inter18pt-Regular',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter18pt-Regular',
    color: '#FFFFFF',
  },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF00',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter18pt-Bold',
    color: '#FFFFFF',
  },
  acceptButtonText: {
    color: '#000000',
  },
  debugPanel: {
    position: 'absolute',
    bottom: 120,
    left: 10,
    right: 10,
    maxWidth: 400,
    maxHeight: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  debugPanelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter18pt-Regular',
    marginBottom: 3,
  },
});

export default PostCapturePreview;