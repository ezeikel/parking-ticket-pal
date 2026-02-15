import { View, Text } from 'react-native';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { WizardStepProps, ChallengeReason } from '../types';
import { CHALLENGE_REASONS } from '../types';

const ReasonStep = ({ onNext }: WizardStepProps) => {
  const handleSelect = (reason: ChallengeReason) => {
    onNext({ challengeReason: reason });
  };

  return (
    <View>
      <Text className="font-jakarta text-sm text-gray-500 mb-6">
        Select the reason that best matches your situation.
      </Text>

      <View className="gap-y-2">
        {CHALLENGE_REASONS.map((reason) => (
          <SquishyPressable
            key={reason.id}
            onPress={() => handleSelect(reason.id)}
            className="rounded-xl border-2 border-gray-200 p-4"
          >
            <Text className="font-jakarta-semibold text-base text-gray-900">{reason.label}</Text>
            <Text className="font-jakarta text-sm text-gray-500 mt-0.5">{reason.desc}</Text>
          </SquishyPressable>
        ))}
      </View>
    </View>
  );
};

export default ReasonStep;
