import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Modal, Pressable } from 'react-native';
import { toast } from '@/lib/toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/pro-regular-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from '@tanstack/react-form';
import { type Address, AddressSchema } from '@parking-ticket-pal/types';
import SquishyPressable from './SquishyPressable/SquishyPressable';
import AddressInput from './AddressInput/AddressInput';
import { ActionButton, ActionButtonGroup } from './ActionButton';

interface EditableAddressBottomSheetProps {
  visible: boolean;
  address?: Address | null;
  onSave: (address: Address) => Promise<void>;
  onCancel: () => void;
}

const EditableAddressBottomSheet = ({
  visible,
  address,
  onSave,
  onCancel,
}: EditableAddressBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const [useAutocomplete, setUseAutocomplete] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(address || null);

  const form = useForm({
    defaultValues: {
      line1: address?.line1 || '',
      line2: address?.line2 || '',
      city: address?.city || '',
      county: address?.county || '',
      postcode: address?.postcode || '',
      country: address?.country || 'United Kingdom',
      coordinates: {
        latitude: address?.coordinates?.latitude || 0,
        longitude: address?.coordinates?.longitude || 0,
      },
    },
    onSubmit: async ({ value }) => {
      try {
        setIsSaving(true);
        await onSave(value as Address);
        toast.success('Success', 'Address updated successfully');
      } catch (error) {
        console.error('Error saving address:', error);
        toast.error('Error', 'Failed to update address');
      } finally {
        setIsSaving(false);
      }
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      form.reset();
      setSelectedAddress(address || null);
      setIsSaving(false);
      setUseAutocomplete(true);
    }
  }, [visible]);

  const handleCancel = () => {
    form.reset();
    setSelectedAddress(address || null);
    onCancel();
  };

  const handleAddressSelect = (newAddress: Address) => {
    setSelectedAddress(newAddress);
    form.setFieldValue('line1', newAddress.line1);
    form.setFieldValue('line2', newAddress.line2 || '');
    form.setFieldValue('city', newAddress.city);
    form.setFieldValue('county', newAddress.county || '');
    form.setFieldValue('postcode', newAddress.postcode);
    form.setFieldValue('country', newAddress.country);
    form.setFieldValue('coordinates', newAddress.coordinates);
  };

  const formatAddress = (addr: Address) => {
    const parts = [
      addr.line1,
      addr.line2,
      addr.city,
      addr.county,
      addr.postcode,
    ].filter(Boolean);
    return parts.join(', ');
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
          <View className="flex-row items-center mb-4">
            <Text className="font-jakarta-semibold text-xl text-gray-900 flex-1">
              Edit Address
            </Text>
            <SquishyPressable
              onPress={() => setUseAutocomplete(!useAutocomplete)}
              className="px-3 py-1 bg-gray-200 rounded mr-2"
            >
              <Text className="font-jakarta text-xs text-gray-700">
                {useAutocomplete ? 'Manual Entry' : 'Autocomplete'}
              </Text>
            </SquishyPressable>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Description */}
          <Text className="font-jakarta text-sm text-gray-600 mb-4">
            Your address will be used on official forms and letters.
          </Text>

          {/* Selected Address Preview */}
          {useAutocomplete && selectedAddress && (
            <View className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
              <Text className="font-jakarta-semibold text-sm text-gray-900 mb-1">
                Selected Address:
              </Text>
              <Text className="font-jakarta text-sm text-gray-600">
                {formatAddress(selectedAddress)}
              </Text>
            </View>
          )}

          {/* Content */}
          <ScrollView className="flex-1 mb-4" style={{ marginTop: useAutocomplete && !selectedAddress ? 12 : 0 }}>
            {useAutocomplete ? (
              <View className="mb-3">
                <AddressInput
                  onSelect={handleAddressSelect}
                  initialValue={selectedAddress ? formatAddress(selectedAddress) : ''}
                  placeholder="Start typing your address"
                />
              </View>
            ) : (
              <View>
                <form.Field name="line1" validators={{ onChange: AddressSchema.shape.line1 }}>
                  {(field) => (
                    <View className="mb-3">
                      <Text className="font-jakarta text-sm text-gray-700 mb-1">
                        Address Line 1 *
                      </Text>
                      <TextInput
                        className="font-jakarta text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Street address"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <Text className="font-jakarta text-xs text-red-500 mt-1">
                          {String(field.state.meta.errors[0]?.message || field.state.meta.errors[0])}
                        </Text>
                      )}
                    </View>
                  )}
                </form.Field>

                <form.Field name="line2">
                  {(field) => (
                    <View className="mb-3">
                      <Text className="font-jakarta text-sm text-gray-700 mb-1">
                        Address Line 2
                      </Text>
                      <TextInput
                        className="font-jakarta text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Apartment, suite, etc. (optional)"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                    </View>
                  )}
                </form.Field>

                <form.Field name="city" validators={{ onChange: AddressSchema.shape.city }}>
                  {(field) => (
                    <View className="mb-3">
                      <Text className="font-jakarta text-sm text-gray-700 mb-1">
                        City *
                      </Text>
                      <TextInput
                        className="font-jakarta text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="City"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <Text className="font-jakarta text-xs text-red-500 mt-1">
                          {String(field.state.meta.errors[0]?.message || field.state.meta.errors[0])}
                        </Text>
                      )}
                    </View>
                  )}
                </form.Field>

                <form.Field name="county">
                  {(field) => (
                    <View className="mb-3">
                      <Text className="font-jakarta text-sm text-gray-700 mb-1">
                        County
                      </Text>
                      <TextInput
                        className="font-jakarta text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="County (optional)"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                    </View>
                  )}
                </form.Field>

                <form.Field name="postcode" validators={{ onChange: AddressSchema.shape.postcode }}>
                  {(field) => (
                    <View className="mb-3">
                      <Text className="font-jakarta text-sm text-gray-700 mb-1">
                        Postcode *
                      </Text>
                      <TextInput
                        className="font-jakarta text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Postcode"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                        autoCapitalize="characters"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <Text className="font-jakarta text-xs text-red-500 mt-1">
                          {String(field.state.meta.errors[0]?.message || field.state.meta.errors[0])}
                        </Text>
                      )}
                    </View>
                  )}
                </form.Field>

                <form.Field name="country" validators={{ onChange: AddressSchema.shape.country }}>
                  {(field) => (
                    <View className="mb-3">
                      <Text className="font-jakarta text-sm text-gray-700 mb-1">
                        Country *
                      </Text>
                      <TextInput
                        className="font-jakarta text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Country"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <Text className="font-jakarta text-xs text-red-500 mt-1">
                          {String(field.state.meta.errors[0]?.message || field.state.meta.errors[0])}
                        </Text>
                      )}
                    </View>
                  )}
                </form.Field>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <ActionButtonGroup gap={8}>
            <ActionButton
              onPress={handleCancel}
              icon={faXmark}
              label="Cancel"
              variant="secondary"
              disabled={isSaving}
            />
            <ActionButton
              onPress={form.handleSubmit}
              label="Save Changes"
              variant="primary"
              disabled={isSaving || (useAutocomplete && !selectedAddress)}
              loading={isSaving}
            />
          </ActionButtonGroup>
        </View>
      </View>
    </Modal>
  );
};

EditableAddressBottomSheet.displayName = 'EditableAddressBottomSheet';

export default EditableAddressBottomSheet;
