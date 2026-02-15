import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AddressInput from '@/components/AddressInput/AddressInput';
import { CONTRAVENTION_CODES_OPTIONS } from '@parking-ticket-pal/constants';
import { ticketFormSchema, type TicketFormData } from '@parking-ticket-pal/types';
import { useAnalytics, getValidationErrorsProperties } from '@/lib/analytics';
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

  const { control, handleSubmit, formState: { errors } } = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
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
    },
  });

  const onFormSubmit = async (data: TicketFormData) => {
    try {
      // Track validation errors if any
      if (Object.keys(errors).length > 0) {
        const validationProperties = getValidationErrorsProperties(errors);
        trackEvent("error_occurred", {
          screen: "ticket_form",
          ...validationProperties
        });
      }

      await onSubmit(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit ticket. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-2xl font-jakarta-bold mb-6 text-center">Ticket Details</Text>

        {/* Vehicle Registration */}
        <View className="mb-4">
          <Text className="text-base font-jakarta-medium mb-2">Vehicle Registration *</Text>
          <Controller
            control={control}
            name="vehicleReg"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="AB12 CDE"
                value={value}
                onChangeText={(text) => onChange(text.toUpperCase())}
                onBlur={onBlur}
                autoCapitalize="characters"
              />
            )}
          />
          {errors.vehicleReg && (
            <Text className="text-red-500 text-sm mt-1">{errors.vehicleReg.message}</Text>
          )}
        </View>

        {/* PCN Number */}
        <View className="mb-4">
          <Text className="text-base font-jakarta-medium mb-2">PCN Number *</Text>
          <Controller
            control={control}
            name="pcnNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="PCN12345678"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.pcnNumber && (
            <Text className="text-red-500 text-sm mt-1">{errors.pcnNumber.message}</Text>
          )}
        </View>

        {/* Date Issued */}
        <View className="mb-4">
          <Text className="text-base font-jakarta-medium mb-2">Date Issued *</Text>
          <Controller
            control={control}
            name="issuedAt"
            render={({ field: { onChange, value } }) => (
              <>
                <SquishyPressable
                  className="border border-gray-300 rounded-lg px-3 py-3"
                  onPress={() => {
                    trackEvent("date_picker_opened", { screen: "ticket_form" });
                    setShowDatePicker(true);
                  }}
                >
                  <Text className="text-base">
                    {value ? value.toLocaleDateString() : 'Select date'}
                  </Text>
                </SquishyPressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        onChange(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}
          />
          {errors.issuedAt && (
            <Text className="text-red-500 text-sm mt-1">{errors.issuedAt.message}</Text>
          )}
        </View>

        {/* Contravention Code with Search */}
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

          <Controller
            control={control}
            name="contraventionCode"
            render={({ field: { onChange, value } }) => (
              <View className="border border-gray-300 rounded-lg">
                <Picker
                  selectedValue={value}
                  onValueChange={(selectedValue) => {
                    onChange(selectedValue);
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
            )}
          />
          {errors.contraventionCode && (
            <Text className="text-red-500 text-sm mt-1">{errors.contraventionCode.message}</Text>
          )}
        </View>

        {/* Initial Amount */}
        <View className="mb-4">
          <Text className="text-base font-jakarta-medium mb-2">Initial Amount (£) *</Text>
          <Controller
            control={control}
            name="initialAmount"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="70"
                value={value === 0 ? '' : (value / 100).toString()}
                onChangeText={(text) => {
                  const amount = parseFloat(text) || 0;
                  onChange(Math.round(amount * 100));
                }}
                onBlur={onBlur}
                keyboardType="numeric"
              />
            )}
          />
          {errors.initialAmount && (
            <Text className="text-red-500 text-sm mt-1">{errors.initialAmount.message}</Text>
          )}
        </View>

        {/* Issuer */}
        <View className="mb-4">
          <Text className="text-base font-jakarta-medium mb-2">Issuer *</Text>
          <Controller
            control={control}
            name="issuer"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="Local Council"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.issuer && (
            <Text className="text-red-500 text-sm mt-1">{errors.issuer.message}</Text>
          )}
        </View>

        {/* Location with Mapbox Autocomplete */}
        <View className="mb-6">
          <Text className="text-base font-jakarta-medium mb-2">Location *</Text>
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <AddressInput
                onSelect={onChange}
                initialValue={
                  value?.line1
                    ? `${value.line1}, ${value.city}, ${value.postcode}`
                    : undefined
                }
                placeholder="Start typing the location"
              />
            )}
          />
          {errors.location && (
            <Text className="text-red-500 text-sm mt-1">Location is required</Text>
          )}
        </View>
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
            onPress={handleSubmit(onFormSubmit)}
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
    </View>
  );
};

export default TicketForm;