import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { toast } from '@/lib/toast';
import { useForm } from '@tanstack/react-form';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AddressInput from '@/components/AddressInput/AddressInput';
import { CONTRAVENTION_CODES_OPTIONS } from '@parking-ticket-pal/constants';
import { ticketFormSchema, type TicketFormData } from '@parking-ticket-pal/types';
import { useAnalytics } from '@/lib/analytics';
import Loader from '../Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';


type TicketFormProps = {
  initialData?: Partial<TicketFormData>;
  onSubmit: (data: TicketFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

const TicketForm = ({ initialData, onSubmit, onCancel, isLoading = false }: TicketFormProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [contraventionSearch, setContraventionSearch] = useState('');
  const { trackEvent } = useAnalytics();

  // Filter contravention codes based on search
  const filteredContraventionCodes = CONTRAVENTION_CODES_OPTIONS.filter(code =>
    code.label.toLowerCase().includes(contraventionSearch.toLowerCase())
  );

  const form = useForm({
    defaultValues: {
      vehicleReg: initialData?.vehicleReg || '',
      pcnNumber: initialData?.pcnNumber || '',
      issuedAt: initialData?.issuedAt || new Date(),
      contraventionCode: initialData?.contraventionCode || '',
      initialAmount: initialData?.initialAmount || 0,
      issuer: initialData?.issuer || '',
      location: initialData?.location || {
        line1: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      },
    } as TicketFormData,
    validators: {
      onSubmit: ticketFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value);
      } catch (error) {
        toast.error('Error', 'Failed to submit ticket. Please try again.');
      }
    },
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-2xl font-jakarta-bold mb-6 text-center">Ticket Details</Text>

        {/* Vehicle Registration */}
        <form.Field
          name="vehicleReg"
          validators={{
            onBlur: ticketFormSchema.shape.vehicleReg,
          }}
        >
          {(field) => (
            <View className="mb-4">
              <Text className="text-base font-jakarta-medium mb-2">Vehicle Registration *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="AB12 CDE"
                value={field.state.value}
                onChangeText={(text) => field.handleChange(text.toUpperCase())}
                onBlur={field.handleBlur}
                autoCapitalize="characters"
              />
              <Text className="text-gray-500 text-xs mt-1">Found on the ticket. UK format: AB12 CDE</Text>
              {field.state.meta.errors.length > 0 && (
                <Text className="text-red-500 text-sm mt-1">{String(field.state.meta.errors[0])}</Text>
              )}
            </View>
          )}
        </form.Field>

        {/* PCN Number */}
        <form.Field
          name="pcnNumber"
          validators={{
            onBlur: ticketFormSchema.shape.pcnNumber,
          }}
        >
          {(field) => (
            <View className="mb-4">
              <Text className="text-base font-jakarta-medium mb-2">PCN Number *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="PCN12345678"
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
              />
              <Text className="text-gray-500 text-xs mt-1">The unique reference number on your penalty charge notice</Text>
              {field.state.meta.errors.length > 0 && (
                <Text className="text-red-500 text-sm mt-1">{String(field.state.meta.errors[0])}</Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Date Issued */}
        <form.Field name="issuedAt">
          {(field) => (
            <View className="mb-4">
              <Text className="text-base font-jakarta-medium mb-2">Date Issued *</Text>
              <SquishyPressable
                className="border border-gray-300 rounded-lg px-3 py-3"
                onPress={() => {
                  trackEvent("date_picker_opened", { screen: "ticket_form" });
                  setShowDatePicker(true);
                }}
              >
                <Text className="text-base">
                  {field.state.value ? field.state.value.toLocaleDateString() : 'Select date'}
                </Text>
              </SquishyPressable>
              {showDatePicker && (
                <DateTimePicker
                  value={field.state.value || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      field.handleChange(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
              {field.state.meta.errors.length > 0 && (
                <Text className="text-red-500 text-sm mt-1">{String(field.state.meta.errors[0])}</Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Contravention Code with Search */}
        <form.Field name="contraventionCode">
          {(field) => (
            <View className="mb-4">
              <Text className="text-base font-jakarta-medium mb-2">Contravention *</Text>

              {/* Search input */}
              <View className="mb-2">
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                  placeholder="Search contraventions..."
                  value={contraventionSearch}
                  onChangeText={(text) => {
                    setContraventionSearch(text);
                    if (text.length > 2) {
                      trackEvent("contravention_code_searched", {
                        screen: "ticket_form",
                        search_query: text
                      });
                    }
                  }}
                />
              </View>

              <View className="border border-gray-300 rounded-lg">
                <Picker
                  selectedValue={field.state.value}
                  onValueChange={(selectedValue) => {
                    field.handleChange(selectedValue);
                    if (selectedValue) {
                      trackEvent("contravention_code_selected", {
                        screen: "ticket_form",
                        selected_value: selectedValue
                      });
                    }
                  }}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="Select a contravention code" value="" />
                  {filteredContraventionCodes.map((code) => (
                    <Picker.Item
                      key={code.value}
                      label={code.label}
                      value={code.value}
                    />
                  ))}
                </Picker>
              </View>
              {field.state.meta.errors.length > 0 && (
                <Text className="text-red-500 text-sm mt-1">{String(field.state.meta.errors[0])}</Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Initial Amount */}
        <form.Field
          name="initialAmount"
          validators={{
            onBlur: ticketFormSchema.shape.initialAmount,
          }}
        >
          {(field) => (
            <View className="mb-4">
              <Text className="text-base font-jakarta-medium mb-2">Initial Amount (£) *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="70"
                value={field.state.value === 0 ? '' : String(field.state.value / 100)}
                onChangeText={(text) => {
                  const amount = parseFloat(text) || 0;
                  field.handleChange(Math.round(amount * 100));
                }}
                onBlur={field.handleBlur}
                keyboardType="numeric"
              />
              <Text className="text-gray-500 text-xs mt-1">Enter the amount in pounds (e.g. 70)</Text>
              {field.state.meta.errors.length > 0 && (
                <Text className="text-red-500 text-sm mt-1">{String(field.state.meta.errors[0])}</Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Issuer */}
        <form.Field
          name="issuer"
          validators={{
            onBlur: ticketFormSchema.shape.issuer,
          }}
        >
          {(field) => (
            <View className="mb-4">
              <Text className="text-base font-jakarta-medium mb-2">Issuer *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="Local Council"
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
              />
              <Text className="text-gray-500 text-xs mt-1">The council or company that issued the ticket</Text>
              {field.state.meta.errors.length > 0 && (
                <Text className="text-red-500 text-sm mt-1">{String(field.state.meta.errors[0])}</Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Location with Mapbox Autocomplete */}
        <form.Field name="location">
          {(field) => (
            <View className="mb-6">
              <Text className="text-base font-jakarta-medium mb-2">Location *</Text>
              <AddressInput
                onSelect={field.handleChange}
                initialValue={
                  field.state.value?.line1
                    ? `${field.state.value.line1}, ${field.state.value.city}, ${field.state.value.postcode}`
                    : undefined
                }
                placeholder="Start typing the location"
              />
              <Text className="text-gray-500 text-xs mt-1">Start typing the street address where you were parked</Text>
              {field.state.meta.errors.length > 0 && (
                <Text className="text-red-500 text-sm mt-1">Location is required</Text>
              )}
            </View>
          )}
        </form.Field>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="p-4 bg-white border-t border-gray-200">
        <View className="flex-row gap-3">
          <SquishyPressable
            onPress={onCancel}
            className="flex-1 py-4 border border-gray-300 rounded-lg bg-gray-50"
            disabled={isLoading}
          >
            <Text className="text-center font-jakarta-semibold text-gray-700">Cancel</Text>
          </SquishyPressable>

          <SquishyPressable
            onPress={() => form.handleSubmit()}
            className="flex-1 bg-dark py-4 rounded-lg shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader size={20} color="white" />
            ) : (
              <Text className="text-white text-center font-jakarta-semibold">Create Ticket</Text>
            )}
          </SquishyPressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default TicketForm;