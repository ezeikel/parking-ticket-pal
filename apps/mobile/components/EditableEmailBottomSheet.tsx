import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faInfoCircle, faXmark } from '@fortawesome/pro-regular-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton } from './ActionButton';

interface EditableEmailBottomSheetProps {
  visible: boolean;
  email: string;
  onClose: () => void;
}

const EditableEmailBottomSheet = ({
  visible,
  email,
  onClose,
}: EditableEmailBottomSheetProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      presentationStyle="formSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, padding: 16, paddingTop: 16 + insets.top }}>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-jakarta-semibold text-xl text-gray-900">
              Email Address
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
            </Pressable>
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
              {"Your email address cannot be changed as it's used for authentication. If you need to change your email, please contact support."}
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
      </View>
    </Modal>
  );
};

EditableEmailBottomSheet.displayName = 'EditableEmailBottomSheet';

export default EditableEmailBottomSheet;
