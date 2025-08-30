import { Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark } from "@fortawesome/pro-regular-svg-icons";
import tw from "twrnc";
import Scanner from '@/components/Scanner/Scanner';

const CaptureScreen = () => {
  const handleClose = () => router.back();

  return (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1 px-4`}>
        <View style={tw`flex-row justify-between items-center py-4`}>
          <Text style={tw`font-bold text-2xl`}>
            Scan Ticket
          </Text>
          <Pressable
            onPress={handleClose}
            style={tw`p-2 -mr-2`}
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