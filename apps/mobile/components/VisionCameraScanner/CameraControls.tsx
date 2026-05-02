import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faImage, faCamera, faXmark, faBolt, faTimer } from '@fortawesome/pro-regular-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type CameraControlsProps = {
  onGalleryPress: () => void;
  onCapturePress: () => void;
  onClosePress: () => void;
  onFlashToggle?: () => void;
  onAutoCaptureToggle?: () => void;
  flashEnabled?: boolean;
  autoCaptureEnabled?: boolean;
  isProcessing?: boolean;
  documentDetected?: boolean;
};

export const CameraControls = ({
  onGalleryPress,
  onCapturePress,
  onClosePress,
  onFlashToggle,
  onAutoCaptureToggle,
  flashEnabled = false,
  autoCaptureEnabled = false,
  isProcessing = false,
  documentDetected = false,
}: CameraControlsProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Top controls */}
      <View style={[styles.topControls, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <SquishyPressable
          onPress={onClosePress}
          style={styles.iconButton}
          disabled={isProcessing}
        >
          <View style={styles.iconButtonInner}>
            <FontAwesomeIcon icon={faXmark} size={28} color="white" />
          </View>
        </SquishyPressable>

        <View style={styles.rightControls}>
          {onAutoCaptureToggle && (
            <SquishyPressable
              onPress={onAutoCaptureToggle}
              style={styles.iconButton}
              disabled={isProcessing}
            >
              <View style={[styles.iconButtonInner, autoCaptureEnabled && styles.activeGreen]}>
                <FontAwesomeIcon icon={faTimer} size={24} color={autoCaptureEnabled ? '#00FF00' : 'white'} />
              </View>
            </SquishyPressable>
          )}
          {onFlashToggle && (
            <SquishyPressable
              onPress={onFlashToggle}
              style={styles.iconButton}
              disabled={isProcessing}
            >
              <View style={[styles.iconButtonInner, flashEnabled && styles.activeYellow]}>
                <FontAwesomeIcon icon={faBolt} size={24} color={flashEnabled ? '#FFD700' : 'white'} />
              </View>
            </SquishyPressable>
          )}
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
        <SquishyPressable onPress={onGalleryPress} style={styles.galleryButton} disabled={isProcessing}>
          <View style={styles.galleryButtonInner}>
            <FontAwesomeIcon icon={faImage} size={28} color="white" />
          </View>
        </SquishyPressable>

        <SquishyPressable
          onPress={onCapturePress}
          style={styles.captureButton}
          disabled={isProcessing}
        >
          <View style={[styles.captureOuter, documentDetected && styles.captureOuterActive]}>
            <View style={[styles.captureInner, documentDetected && styles.captureInnerActive]}>
              <FontAwesomeIcon icon={faCamera} size={32} color={documentDetected ? '#00FF00' : 'white'} />
            </View>
          </View>
        </SquishyPressable>

        <View style={{ width: 56 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  rightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {},
  iconButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeGreen: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  activeYellow: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  galleryButton: {},
  galleryButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  captureButton: {},
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureOuterActive: {
    borderColor: '#00FF00',
  },
  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInnerActive: {
    backgroundColor: '#000',
  },
});
