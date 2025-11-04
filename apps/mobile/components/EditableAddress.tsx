import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faPencil, faLocationDot } from '@fortawesome/pro-regular-svg-icons';
import { type Address } from '@parking-ticket-pal/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import SquishyPressable from './SquishyPressable/SquishyPressable';

interface EditableAddressProps {
  address?: Address | null;
  onPress: () => void;
}

export function EditableAddress({ address, onPress }: EditableAddressProps) {
  const colorScheme = useColorScheme();

  const formatAddress = (addr: Address) => {
    const parts = [
      addr.line1,
      addr.line2,
      addr.city,
      addr.county,
      addr.postcode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <SquishyPressable
      className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
      onPress={onPress}
    >
      <FontAwesomeIcon
        icon={faLocationDot}
        size={20}
        color={Colors[colorScheme ?? 'light'].text}
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className="font-inter text-base text-gray-900">
          Address
        </Text>
        {address ? (
          <Text className="font-inter text-sm text-gray-500 mt-1" numberOfLines={2}>
            {formatAddress(address)}
          </Text>
        ) : (
          <Text className="font-inter text-sm text-gray-400 mt-1">
            Not set
          </Text>
        )}
      </View>
      <FontAwesomeIcon
        icon={address ? faPencil : faPlus}
        size={16}
        color={Colors[colorScheme ?? 'light'].tint}
      />
    </SquishyPressable>
  );
}
