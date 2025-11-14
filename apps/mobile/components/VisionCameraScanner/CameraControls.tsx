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
  documentDetected?: boolean; // New prop for document detection state
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
      {/* Top controls - Close, Auto-capture, and Flash */}
      <View style={[styles.topControls, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <SquishyPressable
          onPress={onClosePress}
          style={styles.closeButton}
          disabled={isProcessing}
        >
          <FontAwesomeIcon icon={faXmark} size={28} color="white" />
        </SquishyPressable>

        <View style={styles.rightControls}>
          {onAutoCaptureToggle && (
            <SquishyPressable
              onPress={onAutoCaptureToggle}
              style={[styles.autoCaptureButton, autoCaptureEnabled && styles.autoCaptureActive]}
              disabled={isProcessing}
            >
              <FontAwesomeIcon
                icon={faTimer}
                size={24}
                color={autoCaptureEnabled ? '#00FF00' : 'white'}
              />
            </SquishyPressable>
          )}

          {onFlashToggle && (
            <SquishyPressable
              onPress={onFlashToggle}
              style={[styles.flashButton, flashEnabled && styles.flashActive]}
              disabled={isProcessing}
            >
              <FontAwesomeIcon
                icon={faBolt}
                size={24}
                color={flashEnabled ? '#FFD700' : 'white'}
              />
            </SquishyPressable>
          )}
        </View>
      </View>

      {/* Bottom controls - Gallery and Capture */}
      <View style={styles.bottomControls}>
        {/* Gallery button - bottom left */}
        <SquishyPressable
          onPress={onGalleryPress}
          style={styles.galleryButton}
          disabled={isProcessing}
        >
          <FontAwesomeIcon icon={faImage} size={28} color="white" />
        </SquishyPressable>

        {/* Capture button - center */}
        <SquishyPressable
          onPress={onCapturePress}
          style={[
            styles.captureButton,
            documentDetected && styles.captureButtonActive,
          ]}
          disabled={isProcessing}
        >
          <View style={[
            styles.captureButtonInner,
            documentDetected && styles.captureButtonInnerActive,
          ]}>
            <FontAwesomeIcon icon={faCamera} size={32} color={documentDetected ? '#00FF00' : 'white'} />
          </View>
        </SquishyPressable>

        {/* Spacer for symmetry */}
        <View style={styles.spacer} />
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
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  autoCaptureButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoCaptureActive: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  flashButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonActive: {
    borderColor: '#00FF00',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInnerActive: {
    backgroundColor: '#000000',
  },
  spacer: {
    width: 56, // Same as gallery button for symmetry
  },
});
