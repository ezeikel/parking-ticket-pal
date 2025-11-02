import { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faPencil, faCheck, faXmark, faPhone } from '@fortawesome/pro-regular-svg-icons';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import SquishyPressable from './SquishyPressable/SquishyPressable';
import Loader from './Loader/Loader';

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

interface EditablePhoneNumberProps {
  phoneNumber?: string | null;
  onSave: (phoneNumber: string) => Promise<void>;
}

export function EditablePhoneNumber({ phoneNumber, onSave }: EditablePhoneNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const colorScheme = useColorScheme();

  const form = useForm({
    defaultValues: {
      phoneNumber: phoneNumber || '',
    },
    onSubmit: async ({ value }) => {
      try {
        setIsSaving(true);
        await onSave(value.phoneNumber);
        setIsEditing(false);
        Alert.alert('Success', 'Mobile number updated successfully');
      } catch (error) {
        console.error('Error saving phone number:', error);
        Alert.alert('Error', 'Failed to update mobile number');
      } finally {
        setIsSaving(false);
      }
    },
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View className="flex-row items-center p-4 border-b border-gray-100 bg-gray-50">
        <FontAwesomeIcon
          icon={faPhone}
          size={20}
          color={Colors[colorScheme ?? 'light'].text}
          style={{ marginRight: 12 }}
        />
        <View className="flex-1">
          <Text className="font-inter text-base text-gray-900 mb-2">
            Mobile Number
          </Text>
          <form.Field
            name="phoneNumber"
            validators={{
              onChange: mobileNumberSchema,
            }}
          >
            {(field) => (
              <>
                <TextInput
                  className="font-inter text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={getPlaceholderText()}
                  keyboardType="phone-pad"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  autoFocus
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="font-inter text-xs text-red-500 mt-1">
                    {String(field.state.meta.errors[0]?.message || field.state.meta.errors[0])}
                  </Text>
                )}
              </>
            )}
          </form.Field>
        </View>
        <View className="flex-row ml-2">
          <SquishyPressable
            onPress={form.handleSubmit}
            disabled={isSaving}
            className="mr-2 w-10 h-10 items-center justify-center"
          >
            {isSaving ? (
              <Loader size={20} color={Colors[colorScheme ?? 'light'].text} />
            ) : (
              <FontAwesomeIcon
                icon={faCheck}
                size={20}
                color="#10b981"
              />
            )}
          </SquishyPressable>
          <SquishyPressable
            onPress={handleCancel}
            disabled={isSaving}
            className="w-10 h-10 items-center justify-center"
          >
            <FontAwesomeIcon
              icon={faXmark}
              size={20}
              color="#ef4444"
            />
          </SquishyPressable>
        </View>
      </View>
    );
  }

  return (
    <SquishyPressable
      className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
      onPress={() => setIsEditing(true)}
    >
      <FontAwesomeIcon
        icon={faPhone}
        size={20}
        color={Colors[colorScheme ?? 'light'].text}
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className="font-inter text-base text-gray-900">
          Mobile Number
        </Text>
        {phoneNumber ? (
          <Text className="font-inter text-sm text-gray-500 mt-1">
            {phoneNumber}
          </Text>
        ) : (
          <Text className="font-inter text-sm text-gray-400 mt-1">
            Not set
          </Text>
        )}
      </View>
      <FontAwesomeIcon
        icon={phoneNumber ? faPencil : faPlus}
        size={16}
        color={Colors[colorScheme ?? 'light'].tint}
      />
    </SquishyPressable>
  );
}
