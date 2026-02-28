import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { type IconDefinition } from '@fortawesome/fontawesome-svg-core';

type EmptyStateProps = {
  icon?: IconDefinition;
  title: string;
  description: string;
};

const EmptyState = ({ icon, title, description }: EmptyStateProps) => {
  return (
    <View className="items-center justify-center px-8">
      {icon && (
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
          <FontAwesomeIcon icon={icon} size={28} color="#9ca3af" />
        </View>
      )}
      <Text className="font-jakarta-semibold text-lg text-dark text-center mb-2">
        {title}
      </Text>
      <Text className="font-jakarta text-sm text-gray text-center">
        {description}
      </Text>
    </View>
  );
};

export default EmptyState;
