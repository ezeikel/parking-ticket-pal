import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateLeft, faCheck } from '@fortawesome/pro-regular-svg-icons';
import Svg, { Line } from 'react-native-svg';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';
import { logger } from '@/lib/logger';
import { usePostCaptureDebug } from '@/hooks/usePostCaptureDebug';

type PostCapturePreviewProps = {
  imageBase64: string;
  detectedCorners: DocumentCorner[] | null;
  onAccept: (corners: DocumentCorner[]) => void;
  onRetake: () => void;
  isProcessing?: boolean;
  stabilityProgress?: number; // For showing auto-capture progress
};

type CornerPosition = {
  x: number;
  y: number;
};

/**
 * Draggable corner handle component
 */
const CornerHandle: React.FC<{
  position: CornerPosition;
  onPositionChange: (position: CornerPosition) => void;
  cornerIndex: number;
  imageWidth: number;
  imageHeight: number;
}> = ({ position, onPositionChange, cornerIndex, imageWidth, imageHeight }) => {
  const translateX = useSharedValue(position.x);
  const translateY = useSharedValue(position.y);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const updatePosition = useCallback((x: number, y: number) => {
    onPositionChange({ x, y });
  }, [onPositionChange]);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Constrain to image bounds
      translateX.value = Math.max(0, Math.min(imageWidth, startX.value + event.translationX));
      translateY.value = Math.max(0, Math.min(imageHeight, startY.value + event.translationY));
    })
    .onEnd(() => {
      runOnJS(updatePosition)(translateX.value, translateY.value);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 20 }, // Center the handle
      { translateY: translateY.value - 20 },
    ],
  }));

  // Corner labels for accessibility
  const cornerLabels = ['Top Left', 'Top Right', 'Bottom Right', 'Bottom Left'];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cornerHandle, animatedStyle]}>
        <View style={styles.cornerHandleInner}>
          <View style={styles.cornerHandleCenter} />
        </View>
        <Text style={styles.cornerLabel}>{cornerLabels[cornerIndex]}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

/**
 * Post-capture preview component
 * Shows captured image with adjustable document corners
 */
const PostCapturePreview: React.FC<PostCapturePreviewProps> = ({
  imageBase64,
  detectedCorners,
  onAccept,
  onRetake,
  isProcessing = false,
  stabilityProgress = 0,
}) => {
  // Debug state for tracking rendering pipeline (only in preview builds)
  const { debugState, dispatch } = usePostCaptureDebug(
    process.env.EXPO_PUBLIC_SHOW_DEBUG_PANELS === 'true'
  );

  // Initialize corners from detected or default to normalized coordinates (0-1)
  const [corners, setCorners] = useState<DocumentCorner[]>(() => {
    const initialCorners = (detectedCorners && detectedCorners.length === 4)
      ? detectedCorners
      : [
          { x: 0.15, y: 0.15 }, // Top-left - 15% inset from edges
          { x: 0.85, y: 0.15 }, // Top-right
          { x: 0.85, y: 0.85 }, // Bottom-right
          { x: 0.15, y: 0.85 }, // Bottom-left
        ];

    logger.info('[PostCapturePreview] Component initialized', {
      screen: 'post_capture_preview',
      hasDetectedCorners: !!(detectedCorners && detectedCorners.length === 4),
      detectedCorners: detectedCorners,
      initialCorners,
      hasImageBase64: !!imageBase64,
      imageBase64Length: imageBase64?.length || 0,
    });

    return initialCorners;
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
  }, []);

  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayBounds, setDisplayBounds] = useState({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0
  });

  // Get actual image dimensions from base64
  useEffect(() => {
    if (imageBase64) {
      logger.debug('[PostCapturePreview] Starting Image.getSize', {
        screen: 'post_capture_preview',
        has_base64: !!imageBase64,
        base64_length: imageBase64.length,
      });

      const imageUri = `data:image/jpeg;base64,${imageBase64}`;
      Image.getSize(
        imageUri,
        (width, height) => {
          dispatch({
            type: 'IMAGE_DIMENSIONS_RECEIVED',
            payload: { width, height },
          });

          logger.info('[PostCapturePreview] Image dimensions received', {
            screen: 'post_capture_preview',
            width,
            height,
          });
          setImageDimensions({ width, height });
        },
        (error) => {
          dispatch({ type: 'IMAGE_DIMENSIONS_FAILED' });

          logger.error('[PostCapturePreview] Failed to get image size', {
            screen: 'post_capture_preview',
          }, error as Error);
        }
      );
    } else {
      logger.warn('[PostCapturePreview] No imageBase64 provided', {
        screen: 'post_capture_preview',
      });
    }
  }, [imageBase64, dispatch]);

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
      dispatch({
        type: 'OVERLAY_RENDERING',
        payload: { rendering: true, cornerHandleCount: corners.length },
      });
    } else {
      dispatch({
        type: 'OVERLAY_RENDERING',
        payload: { rendering: false, cornerHandleCount: 0 },
      });
    }
  }, [displayBounds.width, corners.length, dispatch]);

  const handleCornerChange = (index: number, position: CornerPosition) => {
    const newCorners = [...corners];
    newCorners[index] = position;
    setCorners(newCorners);
  };

  const handleImageLayout = (event: any) => {
    const { width: containerWidth, height: containerHeight, x, y } = event.nativeEvent.layout;

    dispatch({
      type: 'LAYOUT_UPDATED',
      payload: { containerWidth, containerHeight },
    });

    logger.debug('[PostCapturePreview] handleImageLayout called', {
      screen: 'post_capture_preview',
      containerWidth,
      containerHeight,
      x,
      y,
      imageDimensionsWidth: imageDimensions.width,
      imageDimensionsHeight: imageDimensions.height,
    });

    // Can't calculate display bounds until we have both container and image dimensions
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      dispatch({ type: 'DISPLAY_BOUNDS_FAILED' });

      logger.warn('[PostCapturePreview] Cannot calculate display bounds - image dimensions not ready', {
        screen: 'post_capture_preview',
        imageDimensionsWidth: imageDimensions.width,
        imageDimensionsHeight: imageDimensions.height,
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
    const imageRatio = imageDimensions.width / imageDimensions.height;
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
    const cornersToScale = (detectedCorners && detectedCorners.length === 4)
      ? detectedCorners
      : corners;

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
  };

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

    if (displayBounds.width === 0) {
      logger.warn('[PostCapturePreview] Cannot render border lines - displayBounds width is 0', {
        screen: 'post_capture_preview',
        displayBounds,
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

      logger.debug(`[PostCapturePreview] Border line ${index}`, {
        screen: 'post_capture_preview',
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
    });

    logger.info('[PostCapturePreview] Rendering SVG border lines', {
      screen: 'post_capture_preview',
      lineCount: lines.length,
      svgWidth: displayBounds.width,
      svgHeight: displayBounds.height,
    });

    return (
      <Svg
        style={StyleSheet.absoluteFill}
        width={displayBounds.width}
        height={displayBounds.height}
      >
        {lines}
      </Svg>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
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
            resizeMode="contain"
            onLayout={handleImageLayout}
          />

          {/* Overlay with corner handles and border - positioned to match actual image bounds */}
          {(() => {
            logger.debug('[PostCapturePreview] Overlay render check', {
              screen: 'post_capture_preview',
              displayBoundsWidth: displayBounds.width,
              shouldRenderOverlay: displayBounds.width > 0,
            });

            if (displayBounds.width > 0) {
              logger.info('[PostCapturePreview] Rendering overlay', {
                screen: 'post_capture_preview',
                overlayLeft: displayBounds.offsetX,
                overlayTop: displayBounds.offsetY,
                overlayWidth: displayBounds.width,
                overlayHeight: displayBounds.height,
                cornersCount: corners.length,
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
                    {renderBorderLines()}
                  </View>

                  {/* Corner handles */}
                  {corners.map((corner, index) => {
                    const handlePosition = {
                      x: corner.x - displayBounds.offsetX,
                      y: corner.y - displayBounds.offsetY,
                    };

                    logger.debug(`[PostCapturePreview] Rendering corner handle ${index}`, {
                      screen: 'post_capture_preview',
                      index,
                      cornerX: corner.x,
                      cornerY: corner.y,
                      handlePositionX: handlePosition.x,
                      handlePositionY: handlePosition.y,
                    });

                    return (
                      <CornerHandle
                        key={`corner-${index}`}
                        position={handlePosition}
                        onPositionChange={(pos) => handleCornerChange(index, {
                          x: pos.x + displayBounds.offsetX,
                          y: pos.y + displayBounds.offsetY,
                        })}
                        cornerIndex={index}
                        imageWidth={displayBounds.width}
                        imageHeight={displayBounds.height}
                      />
                    );
                  })}
                </View>
              );
            } else {
              logger.warn('[PostCapturePreview] Not rendering overlay - displayBounds.width is 0', {
                screen: 'post_capture_preview',
                displayBounds,
              });
              return null;
            }
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
    </GestureHandlerRootView>
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