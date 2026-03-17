import { Modal, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark, faStreetView } from '@fortawesome/pro-solid-svg-icons';
import { useState } from 'react';
import StreetView from 'react-native-streetview';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type StreetViewModalProps = {
  visible: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
};

export default function StreetViewModal({
  visible,
  onClose,
  latitude,
  longitude,
}: StreetViewModalProps) {
  const insets = useSafeAreaInsets();
  const [noCoverage, setNoCoverage] = useState(false);

  return (
    <Modal
      visible={visible}
      presentationStyle="fullScreen"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-dark">
        {/* Street View */}
        {!noCoverage ? (
          <StreetView
            style={{ flex: 1 }}
            coordinate={{ latitude, longitude }}
            pov={{ tilt: 0, bearing: 0, zoom: 1 }}
            allGesturesEnabled
            onError={() => setNoCoverage(true)}
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-3">
            <FontAwesomeIcon icon={faStreetView} size={40} color="#717171" />
            <Text className="font-jakarta text-sm text-gray text-center px-8">
              Street View is not available at this location.
            </Text>
          </View>
        )}

        {/* Close button */}
        <SquishyPressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close Street View"
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 16,
          }}
        >
          <View className="size-10 rounded-full bg-dark/70 items-center justify-center">
            <FontAwesomeIcon icon={faXmark} size={20} color="#ffffff" />
          </View>
        </SquishyPressable>
      </View>
    </Modal>
  );
}
