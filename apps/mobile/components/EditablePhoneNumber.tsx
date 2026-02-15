import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faPencil, faPhone } from '@fortawesome/pro-regular-svg-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import SquishyPressable from './SquishyPressable/SquishyPressable';

interface EditablePhoneNumberProps {
  phoneNumber?: string | null;
  onPress: () => void;
}

export function EditablePhoneNumber({ phoneNumber, onPress }: EditablePhoneNumberProps) {
  const colorScheme = useColorScheme();

  return (
    <SquishyPressable
      className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
      onPress={onPress}
    >
      <FontAwesomeIcon
        icon={faPhone}
        size={20}
        color={Colors[colorScheme ?? 'light'].text}
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className="font-jakarta text-base text-gray-900">
          Mobile Number
        </Text>
        {phoneNumber ? (
          <Text className="font-jakarta text-sm text-gray-500 mt-1">
            {phoneNumber}
          </Text>
        ) : (
          <Text className="font-jakarta text-sm text-gray-400 mt-1">
            Not set
          </Text>
        )}
      </View>
      <FontAwesomeIcon
        icon={phoneNumber ? faPencil : faPlus}
        size={16}
        color={Colors[colorScheme ?? 'light'].tint}
      />
    </SquishyPressable>
  );
}
