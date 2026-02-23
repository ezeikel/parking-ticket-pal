import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, Modal, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark, faCheck } from '@fortawesome/pro-regular-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { ActionButton, ActionButtonGroup } from './ActionButton';

// TODO: Make this configurable per market when expanding internationally
type Market = 'UK' | 'US';
const CURRENT_MARKET: Market = 'UK'; // Will be dynamic in future

const validateMobileNumber = (val: string): boolean => {
  if (!val) return true;

  switch (CURRENT_MARKET as Market) {
    case 'UK':
      // UK mobile: 07xxxxxxxxx
      return /^(\+44|44|0)?7\d{9}$/.test(val);
    case 'US':
      // US mobile: +1xxxxxxxxxx (10 digits after country code)
      return /^(\+1|1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(val);
    default:
      // Fallback: basic international format
      return /^\+?[1-9]\d{1,14}$/.test(val);
  }
};

const normalizeMobileNumber = (val: string): string => {
  if (!val) return val;

  switch (CURRENT_MARKET as Market) {
    case 'UK':
      if (val.startsWith('0')) {
        return '+44' + val.slice(1);
      } else if (val.startsWith('44') && !val.startsWith('+44')) {
        return '+' + val;
      } else if (!val.startsWith('+')) {
        return '+' + val;
      }
      return val;
    case 'US':
      if (val.startsWith('1') && !val.startsWith('+1')) {
        return '+' + val;
      } else if (!val.startsWith('+')) {
        return '+1' + val;
      }
      return val;
    default:
      return val.startsWith('+') ? val : '+' + val;
  }
};

const getPlaceholderText = (): string => {
  switch (CURRENT_MARKET as Market) {
    case 'UK':
      return '07700 900123 or +447700900123';
    case 'US':
      return '(555) 123-4567 or +15551234567';
    default:
      return '+1234567890';
  }
};

const getErrorMessage = (): string => {
  switch (CURRENT_MARKET as Market) {
    case 'UK':
      return 'Please enter a valid UK mobile number (e.g., +447700900123 or 07700900123)';
    case 'US':
      return 'Please enter a valid US mobile number (e.g., +15551234567 or (555) 123-4567)';
    default:
      return 'Please enter a valid mobile number with country code';
  }
};

const mobileNumberSchema = z.string()
  .refine(validateMobileNumber, {
    message: getErrorMessage()
  })
  .transform(normalizeMobileNumber);

interface EditablePhoneNumberBottomSheetProps {
  visible: boolean;
  phoneNumber?: string | null;
  onSave: (phoneNumber: string) => Promise<void>;
  onCancel: () => void;
}

const EditablePhoneNumberBottomSheet = ({
  visible,
  phoneNumber,
  onSave,
  onCancel,
}: EditablePhoneNumberBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm({
    defaultValues: {
      phoneNumber: phoneNumber || '',
    },
    onSubmit: async ({ value }) => {
      try {
        setIsSaving(true);
        await onSave(value.phoneNumber);
        Alert.alert('Success', 'Mobile number updated successfully');
      } catch (error) {
        console.error('Error saving phone number:', error);
        Alert.alert('Error', 'Failed to update mobile number');
      } finally {
        setIsSaving(false);
      }
    },
  });

  // Reset form when modal is opened
  useEffect(() => {
    if (visible) {
      form.reset();
      setIsSaving(false);
    }
  }, [visible, phoneNumber]);

  const handleCancel = () => {
    form.reset();
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
              Edit Mobile Number
            </Text>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Description */}
          <Text className="font-jakarta text-sm text-gray-600 mb-4">
            Your mobile number will be used for contact purposes on forms and letters.
          </Text>

          {/* Input */}
          <View className="mb-6">
            <form.Field
              name="phoneNumber"
              validators={{
                onChange: mobileNumberSchema,
              }}
            >
              {(field) => (
                <>
                  <Text className="font-jakarta text-sm text-gray-700 mb-2">
                    Mobile Number
                  </Text>
                  <TextInput
                    className="font-jakarta text-base bg-white border border-gray-300 rounded-lg px-4 py-3"
                    placeholder={getPlaceholderText()}
                    keyboardType="phone-pad"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <Text className="font-jakarta text-xs text-red-500 mt-2">
                      {String(field.state.meta.errors[0]?.message || field.state.meta.errors[0])}
                    </Text>
                  )}
                </>
              )}
            </form.Field>
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
              onPress={form.handleSubmit}
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

EditablePhoneNumberBottomSheet.displayName = 'EditablePhoneNumberBottomSheet';

export default EditablePhoneNumberBottomSheet;
