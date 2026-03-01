import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLandmark } from '@fortawesome/pro-solid-svg-icons';
import { faP } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { WizardStepProps, IssuerType } from '../types';

const IssuerStep = ({ onNext }: WizardStepProps) => {
  const handleSelect = (issuerType: IssuerType) => {
    onNext({ issuerType });
  };

  return (
    <View className="gap-y-3">
      <Text className="font-jakarta text-sm text-gray-500 mb-3">
        Check the top of your letter or ticket.
      </Text>

      <SquishyPressable
        testID="issuer-council"
        onPress={() => handleSelect('council')}
        className="flex-row items-start gap-x-4 rounded-xl border-2 border-gray-200 p-4"
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: '#FFF7ED' }}
        >
          <FontAwesomeIcon icon={faLandmark} size={16} color="#F59E0B" />
        </View>
        <View className="flex-1">
          <Text className="font-jakarta-semibold text-base text-gray-900">
            A Local Council / Authority
          </Text>
          <Text className="font-jakarta text-sm text-gray-500 mt-1">
            {'It says "Penalty Charge Notice" (PCN). It mentions the Traffic Management Act 2004.'}
          </Text>
        </View>
      </SquishyPressable>

      <SquishyPressable
        testID="issuer-private"
        onPress={() => handleSelect('private')}
        className="flex-row items-start gap-x-4 rounded-xl border-2 border-gray-200 p-4"
      >
        <View className="w-10 h-10 rounded-full items-center justify-center bg-blue-100">
          <FontAwesomeIcon icon={faP} size={16} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text className="font-jakarta-semibold text-base text-gray-900">
            A Private Company
          </Text>
          <Text className="font-jakarta text-sm text-gray-500 mt-1">
            {'It says "Parking Charge Notice". Issued by companies like ParkingEye, APCOA, Euro Car'}
            Parks.
          </Text>
        </View>
      </SquishyPressable>
    </View>
  );
};

export default IssuerStep;
