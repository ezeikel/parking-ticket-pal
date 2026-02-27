import { Modal, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark } from "@fortawesome/pro-regular-svg-icons";
import Scanner from '@/components/Scanner/Scanner';
import { useState } from 'react';
import { logger } from '@/lib/logger';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type CaptureModalProps = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

const CaptureModal = ({ isVisible, setIsVisible }: CaptureModalProps) => {
  const [hasScannedImage, setHasScannedImage] = useState(false);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setIsVisible(false)}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 bg-white">
          {hasScannedImage && (
            <View className="flex-1 px-4">
              <View className="flex-row justify-between items-center relative">
                <Text className="font-lato-bold text-2xl">
                  Scan Ticket
                </Text>
                <SquishyPressable
                  onPress={() => setIsVisible(false)}
                  className="absolute top-0 right-0"
                  hitSlop={8}
                >
                  <FontAwesomeIcon icon={faXmark} size={24} />
                </SquishyPressable>
              </View>
            </View>
          )}

          <Scanner
            key={isVisible ? 'open' : 'closed'}
            onClose={() => {
              logger.debug('Scanner onClose called, hiding modal', { screen: 'capture-modal', action: 'scanner' });
              setHasScannedImage(false);
              setIsVisible(false);
            }}
            onImageScanned={() => setHasScannedImage(true)}
            onOCRComplete={() => {
              // OCR handled by parent flow
            }}
          />
        </View>
      </SafeAreaView>

    </Modal>
  )
}

export default CaptureModal;