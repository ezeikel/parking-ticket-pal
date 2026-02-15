import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faGavel, faCircleInfo } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { WizardStepProps, UserIntent } from '../types';

const IntentStep = ({ onNext }: WizardStepProps) => {
  const handleSelect = (intent: UserIntent) => {
    onNext({ intent });
  };

  return (
    <View>
      <Text className="font-jakarta text-sm text-gray-500 mb-6">
        You can track your ticket or challenge it right away.
      </Text>

      <View className="gap-y-3 mb-4">
        <SquishyPressable
          onPress={() => handleSelect('track')}
          className="flex-row items-start gap-x-4 rounded-xl border-2 border-gray-200 p-4"
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: '#F0FDF4' }}
          >
            <FontAwesomeIcon icon={faBell} size={16} color="#1ABC9C" />
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-semibold text-base text-gray-900">
              Just track my ticket
            </Text>
            <Text className="font-jakarta text-sm text-gray-500 mt-1">
              Get reminders before deadlines and keep all your tickets in one place. Free to start.
            </Text>
          </View>
        </SquishyPressable>

        <SquishyPressable
          onPress={() => handleSelect('challenge')}
          className="flex-row items-start gap-x-4 rounded-xl border-2 border-gray-200 p-4"
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: '#FFF7ED' }}
          >
            <FontAwesomeIcon icon={faGavel} size={16} color="#F59E0B" />
          </View>
          <View className="flex-1">
            <Text className="font-jakarta-semibold text-base text-gray-900">
              I want to challenge it
            </Text>
            <Text className="font-jakarta text-sm text-gray-500 mt-1">
              Get your success score, AI-generated appeal letter, and optional auto-submission.
            </Text>
          </View>
        </SquishyPressable>
      </View>

      {/* Info note */}
      <View className="rounded-lg p-3 bg-gray-50">
        <View className="flex-row items-start gap-x-2">
          <FontAwesomeIcon icon={faCircleInfo} size={14} color="#1ABC9C" style={{ marginTop: 2 }} />
          <Text className="font-jakarta text-sm text-gray-500 flex-1">
            Not sure yet? Track your ticket now and decide later. You can always challenge from your
            dashboard.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default IntentStep;
