import { View, Text, TextInput, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { Address } from '@parking-ticket-pal/types';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import IssuerInput from '@/components/IssuerInput/IssuerInput';
import AddressInput from '@/components/AddressInput/AddressInput';
import type { WizardStepProps } from '../types';

const DetailsStep = ({ wizardData, onNext }: WizardStepProps) => {
  const [pcnNumber, setPcnNumber] = useState(wizardData.pcnNumber);
  const [vehicleReg, setVehicleReg] = useState(wizardData.vehicleReg);
  const [issuer, setIssuer] = useState(wizardData.issuer);
  const [issuedAt, setIssuedAt] = useState<Date | null>(wizardData.issuedAt);
  const [amountText, setAmountText] = useState(
    wizardData.initialAmount ? String(wizardData.initialAmount / 100) : '',
  );
  const [location, setLocation] = useState<Address | null>(
    wizardData.location,
  );

  const [pcnTouched, setPcnTouched] = useState(false);
  const [regTouched, setRegTouched] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const parsedAmount = parseFloat(amountText);
  const amountInPence =
    !isNaN(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount * 100)
      : 0;

  const isValid =
    pcnNumber.trim().length > 0 &&
    vehicleReg.trim().length > 0 &&
    issuer.length > 0 &&
    issuedAt !== null &&
    amountInPence > 0 &&
    location !== null;

  const pcnError = pcnTouched && !pcnNumber.trim();
  const regError = regTouched && !vehicleReg.trim();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="font-jakarta text-sm text-gray-500 mb-6">
        Enter the details from your ticket or letter.
      </Text>

      {/* PCN Number */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
          PCN / Reference Number
        </Text>
        <TextInput
          className={`border rounded-lg px-4 py-3 text-base font-jakarta ${pcnError ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="e.g. WK12345678"
          value={pcnNumber}
          onChangeText={setPcnNumber}
          onBlur={() => setPcnTouched(true)}
          autoCapitalize="characters"
        />
        {pcnError ? (
          <Text className="font-jakarta text-xs text-red-500 mt-1">
            PCN number is required
          </Text>
        ) : (
          <Text className="font-jakarta text-xs text-gray-400 mt-1">
            Usually found at the top of your ticket
          </Text>
        )}
      </View>

      {/* Vehicle Registration */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
          Vehicle Registration
        </Text>
        <TextInput
          className={`border rounded-lg px-4 py-3 text-base font-jakarta uppercase ${regError ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="e.g. AB12 CDE"
          value={vehicleReg}
          onChangeText={(text) => setVehicleReg(text.toUpperCase())}
          onBlur={() => setRegTouched(true)}
          autoCapitalize="characters"
        />
        {regError ? (
          <Text className="font-jakarta text-xs text-red-500 mt-1">
            Vehicle registration is required
          </Text>
        ) : (
          <Text className="font-jakarta text-xs text-gray-400 mt-1">
            Found on the ticket. UK format: AB12 CDE
          </Text>
        )}
      </View>

      {/* Issuer Name */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
          Issuer Name
        </Text>
        <IssuerInput
          onSelect={setIssuer}
          initialValue={issuer}
          issuerType={wizardData.issuerType}
          placeholder="Search for council or company"
        />
        <Text className="font-jakarta text-xs text-gray-400 mt-1">
          The council or company that issued your ticket
        </Text>
      </View>

      {/* Issue Date */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
          Date Issued
        </Text>
        {Platform.OS === 'ios' ? (
          <View className="border border-gray-300 rounded-lg overflow-hidden">
            <DateTimePicker
              value={issuedAt || new Date()}
              mode="date"
              display="inline"
              onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                if (selectedDate) {
                  setIssuedAt(selectedDate);
                }
              }}
              maximumDate={new Date()}
              minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
              style={{ height: 320 }}
            />
          </View>
        ) : (
          <>
            <SquishyPressable
              className="border border-gray-300 rounded-lg px-4 py-3"
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                className={`text-base font-jakarta ${issuedAt ? 'text-gray-900' : 'text-gray-400'}`}
              >
                {issuedAt
                  ? issuedAt.toLocaleDateString('en-GB')
                  : 'Select date'}
              </Text>
            </SquishyPressable>
            {showDatePicker && (
              <DateTimePicker
                value={issuedAt || new Date()}
                mode="date"
                display="default"
                onChange={(
                  _event: DateTimePickerEvent,
                  selectedDate?: Date,
                ) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setIssuedAt(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={
                  new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                }
              />
            )}
          </>
        )}
        <Text className="font-jakarta text-xs text-gray-400 mt-1">
          The date shown on the ticket
        </Text>
      </View>

      {/* Amount */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
          Amount (£)
        </Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 text-base font-jakarta"
          placeholder="e.g. 65"
          value={amountText}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9.]/g, '');
            // Allow only one decimal point
            const parts = cleaned.split('.');
            const sanitized =
              parts.length > 2
                ? parts[0] + '.' + parts.slice(1).join('')
                : cleaned;
            setAmountText(sanitized);
          }}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <Text className="font-jakarta text-xs text-gray-400 mt-1">
          The amount on the ticket in pounds
        </Text>
      </View>

      {/* Location */}
      <View className="mb-6">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
          Location
        </Text>
        <AddressInput
          onSelect={setLocation}
          initialValue={
            location ? `${location.line1}, ${location.postcode}` : ''
          }
          placeholder="Search for the location"
        />
        <Text className="font-jakarta text-xs text-gray-400 mt-1">
          Where the ticket was issued
        </Text>
      </View>

      <SquishyPressable
        onPress={() =>
          onNext({
            pcnNumber: pcnNumber.trim(),
            vehicleReg: vehicleReg.trim(),
            issuer,
            issuedAt,
            initialAmount: amountInPence,
            location,
          })
        }
        disabled={!isValid}
        className="py-4 rounded-xl items-center justify-center mb-8"
        style={{ backgroundColor: isValid ? '#1ABC9C' : '#D1D5DB' }}
      >
        <Text
          className="font-jakarta-semibold text-lg"
          style={{ color: isValid ? '#fff' : '#9CA3AF' }}
        >
          Continue
        </Text>
      </SquishyPressable>
    </ScrollView>
  );
};

export default DetailsStep;
