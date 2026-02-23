import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, Modal, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark, faCheck } from '@fortawesome/pro-regular-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, ActionButtonGroup } from './ActionButton';

interface EditableNameBottomSheetProps {
  visible: boolean;
  currentName?: string | null;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}

const EditableNameBottomSheet = ({
  visible,
  currentName,
  onSave,
  onCancel,
}: EditableNameBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentName || '');
  const [isSaving, setIsSaving] = useState(false);

  // Reset name when modal is opened with new currentName
  useEffect(() => {
    if (visible) {
      setName(currentName || '');
      setIsSaving(false);
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Please enter your name');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(trimmedName);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      console.error('Error saving name:', error);
      Alert.alert('Error', 'Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(currentName || '');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="formSheet"
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={{ flex: 1, padding: 16, paddingTop: 16 + insets.top }}>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-jakarta-semibold text-xl text-gray-900">
              Edit Name
            </Text>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Description */}
          <Text className="font-jakarta text-sm text-gray-600 mb-4">
            Your name will be used on official forms and letters.
          </Text>

          {/* Input */}
          <View className="mb-6">
            <Text className="font-jakarta text-sm text-gray-700 mb-2">
              Full Name
            </Text>
            <TextInput
              className="font-jakarta text-base bg-white border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Action Buttons */}
          <ActionButtonGroup>
            <ActionButton
              onPress={handleCancel}
              icon={faXmark}
              label="Cancel"
              variant="secondary"
              disabled={isSaving}
            />
            <ActionButton
              onPress={handleSave}
              icon={faCheck}
              label="Save Changes"
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
            />
          </ActionButtonGroup>
        </View>
      </View>
    </Modal>
  );
};

EditableNameBottomSheet.displayName = 'EditableNameBottomSheet';

export default EditableNameBottomSheet;
