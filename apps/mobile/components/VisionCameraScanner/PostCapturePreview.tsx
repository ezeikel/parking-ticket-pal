import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateLeft, faCheck } from '@fortawesome/pro-regular-svg-icons';
import Svg, { Polygon } from 'react-native-svg';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import Loader from '@/components/Loader/Loader';
import type { DocumentCorner } from '@/hooks/useDocumentDetection';

type PostCapturePreviewProps = {
  imageUri: string;
  detectedCorners: DocumentCorner[] | null;
  onAccept: () => void;
  onRetake: () => void;
  isProcessing?: boolean;
};

const PostCapturePreview = ({
  imageUri,
  detectedCorners,
  onAccept,
  onRetake,
  isProcessing = false,
}: PostCapturePreviewProps) => {
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });

  const handleImageLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    setImageLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  }, []);

  // Build SVG polygon points from normalized corners
  const polygonPoints = detectedCorners && imageLayout.width > 0
    ? detectedCorners
        .map(c => `${c.x * imageLayout.width},${c.y * imageLayout.height}`)
        .join(' ')
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={styles.container}>
        {/* Image preview with corner overlay */}
        <View style={styles.imageContainer} onLayout={handleImageLayout}>
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
          {polygonPoints && imageLayout.width > 0 && (
            <Svg style={StyleSheet.absoluteFill}>
              <Polygon
                points={polygonPoints}
                fill="rgba(76, 175, 80, 0.15)"
                stroke="rgba(76, 175, 80, 0.9)"
                strokeWidth={2}
              />
            </Svg>
          )}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <Loader size={48} color="white" />
              <Text style={styles.processingText}>Processing with AI...</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* flex:1 must live on the SquishyPressable itself so each button takes
              half the row. Putting it only on the inner View leaves the Pressable
              at intrinsic width and the buttons collapse — same bug fixed for
              Scanner in 5d7dc4f. */}
          <SquishyPressable onPress={onRetake} disabled={isProcessing} style={styles.buttonWrap}>
            <View style={styles.retakeButton}>
              <FontAwesomeIcon icon={faRotateLeft} size={20} color="#fff" />
              <Text style={styles.retakeText}>Retake</Text>
            </View>
          </SquishyPressable>

          <SquishyPressable onPress={onAccept} disabled={isProcessing} style={styles.buttonWrap}>
            <View style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}>
              {isProcessing ? (
                <Loader size={20} color="white" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} size={20} color="white" />
                  <Text style={styles.acceptText}>Process</Text>
                </>
              )}
            </View>
          </SquishyPressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  imageContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  processingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  buttonWrap: {
    flex: 1,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  retakeText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#1ABC9C',
    borderRadius: 8,
  },
  acceptText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default PostCapturePreview;
