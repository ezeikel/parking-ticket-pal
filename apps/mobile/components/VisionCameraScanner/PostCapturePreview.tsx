import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateLeft, faCheck } from '@fortawesome/pro-regular-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const updatePosition = useCallback((x: number, y: number) => {
    onPositionChange({ x, y });
  }, [onPositionChange]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; startY: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      // Constrain to image bounds
      translateX.value = Math.max(0, Math.min(imageWidth, ctx.startX + event.translationX));
      translateY.value = Math.max(0, Math.min(imageHeight, ctx.startY + event.translationY));
    },
    onEnd: () => {
      runOnJS(updatePosition)(translateX.value, translateY.value);
    },
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
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.cornerHandle, animatedStyle]}>
        <View style={styles.cornerHandleInner}>
          <View style={styles.cornerHandleCenter} />
        </View>
        <Text style={styles.cornerLabel}>{cornerLabels[cornerIndex]}</Text>
      </Animated.View>
    </PanGestureHandler>
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
  // Initialize corners from detected or default to full image
  const [corners, setCorners] = useState<DocumentCorner[]>(() => {
    if (detectedCorners && detectedCorners.length === 4) {
      return detectedCorners;
    }
    // Default to image corners if no detection
    return [
      { x: SCREEN_WIDTH * 0.2, y: SCREEN_HEIGHT * 0.2 }, // Top-left
      { x: SCREEN_WIDTH * 0.8, y: SCREEN_HEIGHT * 0.2 }, // Top-right
      { x: SCREEN_WIDTH * 0.8, y: SCREEN_HEIGHT * 0.7 }, // Bottom-right
      { x: SCREEN_WIDTH * 0.2, y: SCREEN_HEIGHT * 0.7 }, // Bottom-left
    ];
  });

  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const handleCornerChange = (index: number, position: CornerPosition) => {
    const newCorners = [...corners];
    newCorners[index] = position;
    setCorners(newCorners);
  };

  const handleImageLayout = (event: any) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    setImageLayout({ width, height, x, y });

    // Scale corners to fit image if they were detected at different resolution
    if (detectedCorners && detectedCorners.length === 4 && width > 0 && height > 0) {
      // Assuming corners are normalized 0-1, scale to image size
      // Adjust this based on your actual corner coordinate system
      const scaledCorners = detectedCorners.map(corner => ({
        x: corner.x * width,
        y: corner.y * height,
      }));
      setCorners(scaledCorners);
    }
  };

  const handleAccept = () => {
    onAccept(corners);
  };

  // Draw connecting lines between corners
  const renderBorderLines = () => {
    if (corners.length !== 4) return null;

    return (
      <Svg
        style={StyleSheet.absoluteFill}
        width={imageLayout.width}
        height={imageLayout.height}
      >
        {/* Draw lines connecting corners */}
        {corners.map((corner, index) => {
          const nextCorner = corners[(index + 1) % 4];
          return (
            <Line
              key={`line-${index}`}
              x1={corner.x}
              y1={corner.y}
              x2={nextCorner.x}
              y2={nextCorner.y}
              stroke="#00FF00"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          );
        })}
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

          {/* Overlay with corner handles and border */}
          {imageLayout.width > 0 && (
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {/* Border lines */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {renderBorderLines()}
              </View>

              {/* Corner handles */}
              {corners.map((corner, index) => (
                <CornerHandle
                  key={`corner-${index}`}
                  position={corner}
                  onPositionChange={(pos) => handleCornerChange(index, pos)}
                  cornerIndex={index}
                  imageWidth={imageLayout.width}
                  imageHeight={imageLayout.height}
                />
              ))}
            </View>
          )}

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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// Note: react-native-svg import for border lines
// You'll need to install: pnpm dlx expo install react-native-svg
const Svg = require('react-native-svg').default;
const Line = require('react-native-svg').Line;

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
});

export default PostCapturePreview;