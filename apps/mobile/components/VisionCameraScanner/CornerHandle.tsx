import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Worklets } from 'react-native-worklets-core';
import * as Sentry from '@sentry/react-native';
import { logger } from '@/lib/logger';
import { useAnalytics } from '@/lib/analytics';

type CornerPosition = {
  x: number;
  y: number;
};

type CornerHandleProps = {
  position: CornerPosition;
  onPositionChange: (position: CornerPosition) => void;
  cornerIndex: number;
  imageWidth: number;
  imageHeight: number;
};

/**
 * Draggable corner handle component for adjusting document corners
 */
const CornerHandle = ({
  position,
  onPositionChange,
  cornerIndex,
  imageWidth,
  imageHeight
}: CornerHandleProps) => {
  // Validate position values before using in Reanimated (prevents Skia crashes)
  const safeX = isFinite(position.x) && !isNaN(position.x) ? position.x : 0;
  const safeY = isFinite(position.y) && !isNaN(position.y) ? position.y : 0;
  const safeWidth = isFinite(imageWidth) && imageWidth > 0 ? imageWidth : 1;
  const safeHeight = isFinite(imageHeight) && imageHeight > 0 ? imageHeight : 1;

  // Log warning if invalid values were sanitized
  if (safeX !== position.x || safeY !== position.y || safeWidth !== imageWidth || safeHeight !== imageHeight) {
    logger.warn('[CornerHandle] Invalid values sanitized', {
      screen: 'post_capture_preview',
      cornerIndex,
      originalPosition: position,
      sanitizedPosition: { x: safeX, y: safeY },
      originalDimensions: { width: imageWidth, height: imageHeight },
      sanitizedDimensions: { width: safeWidth, height: safeHeight },
    });
  }

  // Log right before initializing Reanimated values (critical crash point)
  logger.info('[CornerHandle] Initializing Reanimated values', {
    screen: 'post_capture_preview',
    action: 'reanimated_init',
    cornerIndex,
    safeX,
    safeY,
    safeWidth,
    safeHeight,
    originalX: position.x,
    originalY: position.y,
    originalWidth: imageWidth,
    originalHeight: imageHeight,
  });

  // IMPORTANT: React hooks must be called unconditionally at the top level
  // Never wrap hooks in try-catch or conditional blocks - this violates React's rules
  const translateX = useSharedValue(safeX);
  const translateY = useSharedValue(safeY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Log after successful initialization (hooks don't throw in normal circumstances)
  logger.info('[CornerHandle] Reanimated values initialized', {
    screen: 'post_capture_preview',
    action: 'reanimated_init',
    cornerIndex,
    initialX: safeX,
    initialY: safeY,
  });

  const { trackEvent } = useAnalytics();

  // Log component mount
  useEffect(() => {
    logger.debug('[CornerHandle] Component mounted', {
      screen: 'post_capture_preview',
      action: 'corner_handle_mount',
      cornerIndex,
      positionX: position.x,
      positionY: position.y,
      imageWidth,
      imageHeight,
    });
    trackEvent('corner_handle_mounted', {
      screen: 'post_capture_preview',
      corner_index: cornerIndex,
      position_x: position.x,
      position_y: position.y,
      image_width: imageWidth,
      image_height: imageHeight,
    });
  }, [cornerIndex, position.x, position.y, imageWidth, imageHeight, trackEvent]);

  // Create wrapper function outside worklet context (required for scheduleOnRN)
  // The function must be defined in JS thread scope, not inside the worklet
  // Using useCallback to ensure function reference stability
  const handlePositionChange = useCallback((pos: CornerPosition) => {
    logger.debug('[CornerHandle] handlePositionChange called', {
      screen: 'post_capture_preview',
      action: 'position_change',
      cornerIndex,
      newPosition: pos,
    });
    trackEvent('corner_position_change_called', {
      screen: 'post_capture_preview',
      corner_index: cornerIndex,
      new_position_x: pos.x,
      new_position_y: pos.y,
    });
    try {
      onPositionChange(pos);
      trackEvent('corner_position_change_success', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
        new_position_x: pos.x,
        new_position_y: pos.y,
      });
    } catch (error) {
      logger.error('[CornerHandle] Error in handlePositionChange callback', {
        screen: 'post_capture_preview',
        action: 'position_change_error',
        cornerIndex,
        newPosition: pos,
      }, error as Error);
      trackEvent('corner_position_change_error', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
        new_position_x: pos.x,
        new_position_y: pos.y,
        error_message: (error as Error)?.message,
      });
      Sentry.captureException(error, {
        tags: {
          screen: 'post_capture_preview',
          action: 'position_change_error',
          cornerIndex: cornerIndex.toString(),
        },
        contexts: {
          position: {
            x: pos.x,
            y: pos.y,
          },
        },
      });
    }
  }, [onPositionChange, cornerIndex, trackEvent]);

  // Create adapter function for scheduleOnRN that accepts spread parameters
  // scheduleOnRN expects: scheduleOnRN(fn, ...args) with spread arguments
  // But handlePositionChange expects an object, so we need an adapter
  const updatePosition = useCallback((x: number, y: number) => {
    logger.debug('[CornerHandle] updatePosition adapter called', {
      screen: 'post_capture_preview',
      action: 'update_position_adapter',
      cornerIndex,
      x,
      y,
    });
    // Convert spread parameters back to object for handlePositionChange
    handlePositionChange({ x, y });
  }, [handlePositionChange, cornerIndex]);

  // Try using Worklets.createRunOnJS (same pattern as useDocumentDetection)
  // This is the working pattern from useDocumentDetection.ts
  // Create wrapper once and reuse it
  const positionChangeWrapper = useMemo(() => {
    try {
      logger.debug('[CornerHandle] Attempting to create Worklets.createRunOnJS wrapper', {
        screen: 'post_capture_preview',
        action: 'create_wrapper_attempt',
        cornerIndex,
        handlePositionChangeType: typeof handlePositionChange,
      });
      trackEvent('corner_wrapper_creation_attempt', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
        method: 'worklets_createRunOnJS',
      });
      const wrapper = Worklets.createRunOnJS(handlePositionChange);
      logger.info('[CornerHandle] Successfully created Worklets.createRunOnJS wrapper', {
        screen: 'post_capture_preview',
        action: 'create_wrapper_success',
        cornerIndex,
        wrapperType: typeof wrapper,
      });
      trackEvent('corner_wrapper_creation_success', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
        method: 'worklets_createRunOnJS',
        wrapper_type: typeof wrapper,
      });
      return wrapper;
    } catch (error) {
      logger.error('[CornerHandle] Failed to create Worklets.createRunOnJS wrapper', {
        screen: 'post_capture_preview',
        action: 'create_wrapper_error',
        cornerIndex,
        errorMessage: (error as Error)?.message,
        errorStack: (error as Error)?.stack,
      }, error as Error);
      trackEvent('corner_wrapper_creation_error', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
        method: 'worklets_createRunOnJS',
        error_message: (error as Error)?.message,
      });
      Sentry.captureException(error, {
        tags: {
          screen: 'post_capture_preview',
          action: 'create_wrapper_error',
          cornerIndex: cornerIndex.toString(),
        },
        contexts: {
          component: {
            imageWidth,
            imageHeight,
            positionX: position.x,
            positionY: position.y,
          },
        },
      });
      return null;
    }
  }, [handlePositionChange, cornerIndex, imageWidth, imageHeight, position.x, position.y, trackEvent]);

  // Log wrapper status when it changes
  useEffect(() => {
    logger.debug('[CornerHandle] Wrapper status', {
      screen: 'post_capture_preview',
      action: 'wrapper_status',
      cornerIndex,
      hasWrapper: !!positionChangeWrapper,
      wrapperType: typeof positionChangeWrapper,
      willUseFallback: !positionChangeWrapper,
    });
    trackEvent('corner_wrapper_status', {
      screen: 'post_capture_preview',
      corner_index: cornerIndex,
      has_wrapper: !!positionChangeWrapper,
      wrapper_type: typeof positionChangeWrapper,
      will_use_fallback: !positionChangeWrapper,
    });
  }, [positionChangeWrapper, cornerIndex, trackEvent]);

  // Create a worklet-safe function to log errors (must be created outside worklet)
  const logErrorJS = useMemo(() => {
    return Worklets.createRunOnJS((error: Error, context: any) => {
      logger.error('[CornerHandle] Error in gesture onEnd callback', {
        screen: 'post_capture_preview',
        action: 'gesture_end_error',
        cornerIndex,
        ...context,
        errorMessage: error?.message,
        errorStack: error?.stack,
      }, error);
      try {
        trackEvent('corner_gesture_end_error', {
          screen: 'post_capture_preview',
          corner_index: cornerIndex,
          method: context.method || 'unknown',
          error_message: error?.message,
          has_wrapper: context.gesture?.hasWrapper || false,
          final_x: context.gesture?.finalX,
          final_y: context.gesture?.finalY,
        });
      } catch (trackError) {
        // If PostHog tracking fails, at least log to console
        console.error('[CornerHandle] Failed to track error event:', trackError);
      }
      Sentry.captureException(error, {
        tags: {
          screen: 'post_capture_preview',
          action: 'gesture_end_error',
          cornerIndex: cornerIndex.toString(),
          method: context.method || 'unknown',
        },
        contexts: {
          gesture: context.gesture,
          component: context.component,
        },
        extra: context.extra,
      });
    });
  }, [cornerIndex, trackEvent]);

  // Create worklet-safe PostHog tracking functions
  const trackGestureStartJS = useMemo(() => {
    return Worklets.createRunOnJS(() => {
      trackEvent('corner_gesture_start', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
      });
    });
  }, [cornerIndex, trackEvent]);

  const trackGestureEndJS = useMemo(() => {
    return Worklets.createRunOnJS((method: string, finalX: number, finalY: number) => {
      trackEvent('corner_gesture_end', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
        method,
        final_x: finalX,
        final_y: finalY,
      });
    });
  }, [cornerIndex, trackEvent]);

  const trackGestureEndBeforeCallJS = useMemo(() => {
    return Worklets.createRunOnJS((hasWrapper: boolean, finalX: number, finalY: number) => {
      trackEvent('corner_gesture_end_before_call', {
        screen: 'post_capture_preview',
        corner_index: cornerIndex,
        has_wrapper: hasWrapper,
        final_x: finalX,
        final_y: finalY,
      });
    });
  }, [cornerIndex, trackEvent]);

  const pan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.value = translateX.value;
      startY.value = translateY.value;
      trackGestureStartJS();
    })
    .onUpdate((event) => {
      'worklet';
      // Validate values before using to prevent NaN crashes
      const translationX = isFinite(event.translationX) ? event.translationX : 0;
      const translationY = isFinite(event.translationY) ? event.translationY : 0;

      // Constrain to image bounds (use safe values to prevent crashes)
      const newX = isFinite(startX.value + translationX) ? startX.value + translationX : 0;
      const newY = isFinite(startY.value + translationY) ? startY.value + translationY : 0;

      translateX.value = Math.max(0, Math.min(safeWidth, newX));
      translateY.value = Math.max(0, Math.min(safeHeight, newY));
    })
    .onEnd(() => {
      'worklet';

      const finalX = isFinite(translateX.value) ? translateX.value : 0;
      const finalY = isFinite(translateY.value) ? translateY.value : 0;
      const finalPosition = { x: finalX, y: finalY };

      try {
        // Try Worklets.createRunOnJS wrapper first (working pattern from useDocumentDetection)
        if (positionChangeWrapper) {
          positionChangeWrapper(finalPosition);
          trackGestureEndJS('worklets_wrapper', finalX, finalY);
        } else if (updatePosition) {
          // Fallback to scheduleOnRN
          scheduleOnRN(updatePosition, finalX, finalY);
          trackGestureEndJS('scheduleOnRN', finalX, finalY);
        }
      } catch (error) {
        // Log error from JS thread
        logErrorJS(error as Error, {
          gesture: {
            finalX,
            finalY,
          },
          component: {
            imageWidth,
            imageHeight,
            positionX: position.x,
            positionY: position.y,
          },
        });
      }
    });

  // Log before creating animated style (another potential crash point)
  logger.debug('[CornerHandle] Creating animated style', {
    screen: 'post_capture_preview',
    action: 'animated_style_create',
    cornerIndex,
    translateXValue: translateX.value,
    translateYValue: translateY.value,
  });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    try {
      return {
        transform: [
          { translateX: translateX.value - 20 }, // Center the handle
          { translateY: translateY.value - 20 },
        ],
      };
    } catch (error) {
      // Log worklet errors (though this might not catch JSI crashes)
      console.error('[CornerHandle] Error in animated style worklet:', error);
      return {
        transform: [
          { translateX: 0 },
          { translateY: 0 },
        ],
      };
    }
  });

  // Corner labels for accessibility
  const cornerLabels = ['Top Left', 'Top Right', 'Bottom Right', 'Bottom Left'];

  // Log right before rendering (final checkpoint before potential crash)
  logger.debug('[CornerHandle] Rendering component', {
    screen: 'post_capture_preview',
    action: 'corner_handle_render',
    cornerIndex,
    hasGesture: !!pan,
    hasAnimatedStyle: !!animatedStyle,
  });

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

const styles = StyleSheet.create({
  cornerHandle: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerHandleInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerHandleCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  cornerLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default CornerHandle;