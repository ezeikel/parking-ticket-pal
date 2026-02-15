import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faXmark } from '@fortawesome/pro-regular-svg-icons';

interface FeatureRowProps {
  text: string;
  included: boolean;
}

export function FeatureRow({ text, included }: FeatureRowProps) {
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <FontAwesomeIcon
        icon={included ? faCheck : faXmark}
        size={16}
        color={included ? '#1abc9c' : '#d1d5db'}
      />
      <Text
        className={`font-jakarta text-sm flex-1 ${included ? 'text-dark' : 'text-gray'}`}
      >
        {text}
      </Text>
    </View>
  );
}
