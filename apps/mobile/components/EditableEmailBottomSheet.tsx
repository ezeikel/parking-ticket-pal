import React, { forwardRef, useMemo } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faInfoCircle, faXmark } from '@fortawesome/pro-regular-svg-icons';
import { ActionButton } from './ActionButton';

interface EditableEmailBottomSheetProps {
  email: string;
  onClose: () => void;
}

const EditableEmailBottomSheet = forwardRef<BottomSheet, EditableEmailBottomSheetProps>(
  ({ email, onClose }, ref) => {
    const snapPoints = useMemo(() => ['35%'], []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
          />
        )}
      >
        <BottomSheetView style={{ flex: 1, padding: 16 }}>
          <View className="flex-1">
            {/* Header */}
            <View className="mb-4">
              <Text className="font-jakarta-semibold text-xl text-gray-900">
                Email Address
              </Text>
            </View>

            {/* Email Display */}
            <View className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <Text className="font-jakarta text-base text-gray-900">
                {email}
              </Text>
            </View>

            {/* Info Message */}
            <View className="flex-row items-start p-3 bg-teal/10 rounded-lg border border-teal/20 mb-6">
              <FontAwesomeIcon
                icon={faInfoCircle}
                size={16}
                color="#3b82f6"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text className="font-jakarta text-xs text-teal-dark flex-1">
                Your email address cannot be changed as it's used for authentication. If you need to change your email, please contact support.
              </Text>
            </View>

            {/* Close Button */}
            <ActionButton
              onPress={onClose}
              icon={faXmark}
              label="Close"
              variant="secondary"
              fullWidth
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

EditableEmailBottomSheet.displayName = 'EditableEmailBottomSheet';

export default EditableEmailBottomSheet;
