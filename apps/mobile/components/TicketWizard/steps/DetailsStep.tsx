import { View, Text, TextInput } from 'react-native';
import { useState } from 'react';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { WizardStepProps } from '../types';

const DetailsStep = ({ wizardData, onNext }: WizardStepProps) => {
  const [pcnNumber, setPcnNumber] = useState(wizardData.pcnNumber);
  const [vehicleReg, setVehicleReg] = useState(wizardData.vehicleReg);
  const [pcnTouched, setPcnTouched] = useState(false);
  const [regTouched, setRegTouched] = useState(false);

  const isValid = pcnNumber.trim().length > 0 && vehicleReg.trim().length > 0;
  const pcnError = pcnTouched && !pcnNumber.trim();
  const regError = regTouched && !vehicleReg.trim();

  return (
    <View>
      <Text className="font-jakarta text-sm text-gray-500 mb-6">
        You can find these on your ticket or letter.
      </Text>

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

      <View className="mb-6">
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

      <SquishyPressable
        onPress={() => onNext({ pcnNumber: pcnNumber.trim(), vehicleReg: vehicleReg.trim() })}
        disabled={!isValid}
        className="py-4 rounded-xl items-center justify-center"
        style={{ backgroundColor: isValid ? '#1ABC9C' : '#D1D5DB' }}
      >
        <Text
          className="font-jakarta-semibold text-lg"
          style={{ color: isValid ? '#fff' : '#9CA3AF' }}
        >
          Continue
        </Text>
      </SquishyPressable>
    </View>
  );
};

export default DetailsStep;
