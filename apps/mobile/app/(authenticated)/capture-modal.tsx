import { Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark } from "@fortawesome/pro-regular-svg-icons";
import Scanner from '@/components/Scanner/Scanner';

const CaptureScreen = () => {
  const handleClose = () => router.back();

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-4">
        <View className="flex-row justify-between items-center py-4">
          <Text className="font-lato font-bold text-2xl">
            Scan Ticket
          </Text>
          <Pressable
            onPress={handleClose}
            className="p-2 -mr-2"
            hitSlop={8}
          >
            <FontAwesomeIcon icon={faXmark} size={24} />
          </Pressable>
        </View>

        <Scanner />
      </View>
    </View>
  );
};

export default CaptureScreen;