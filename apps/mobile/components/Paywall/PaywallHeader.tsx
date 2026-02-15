import { View, Text, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/pro-regular-svg-icons';

interface PaywallHeaderProps {
  title: string;
  subtitle: string;
  onClose: () => void;
}

export function PaywallHeader({ title, subtitle, onClose }: PaywallHeaderProps) {
  return (
    <View className="flex-row items-start justify-between px-6 pt-4 pb-2">
      <View className="flex-1 mr-4">
        <Text className="font-jakarta-bold text-2xl text-dark">{title}</Text>
        <Text className="font-jakarta text-sm text-gray mt-1">{subtitle}</Text>
      </View>
      <Pressable
        onPress={onClose}
        className="w-8 h-8 rounded-full bg-light items-center justify-center mt-1"
        hitSlop={8}
      >
        <FontAwesomeIcon icon={faXmark} size={18} color="#222222" />
      </Pressable>
    </View>
  );
}
