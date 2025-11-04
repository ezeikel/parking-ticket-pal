import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { faXmark, faCheck } from '@fortawesome/pro-regular-svg-icons';
import { ActionButton, ActionButtonGroup } from './ActionButton';

interface EditableNameBottomSheetProps {
  currentName?: string | null;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}

const EditableNameBottomSheet = forwardRef<BottomSheet, EditableNameBottomSheetProps>(
  ({ currentName, onSave, onCancel }, ref) => {
    const snapPoints = useMemo(() => ['40%'], []);
    const [name, setName] = useState(currentName || '');
    const [isSaving, setIsSaving] = useState(false);

    // Reset name when sheet is opened with new currentName
    useEffect(() => {
      setName(currentName || '');
    }, [currentName]);

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
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={(index) => {
          // Reset state when sheet is closed
          if (index === -1) {
            setName(currentName || '');
            setIsSaving(false);
          }
        }}
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
              <Text className="font-inter text-xl font-semibold text-gray-900">
                Edit Name
              </Text>
            </View>

            {/* Description */}
            <Text className="font-inter text-sm text-gray-600 mb-4">
              Your name will be used on official forms and letters.
            </Text>

            {/* Input */}
            <View className="mb-6">
              <Text className="font-inter text-sm text-gray-700 mb-2">
                Full Name
              </Text>
              <TextInput
                className="font-inter text-base bg-white border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoFocus
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
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

EditableNameBottomSheet.displayName = 'EditableNameBottomSheet';

export default EditableNameBottomSheet;
