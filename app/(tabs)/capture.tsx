import { SafeAreaView, Text, View, Dimensions } from 'react-native';
import tw from "twrnc";
import Scanner from '@/components/Scanner/Scanner';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const CaptureScreen = () => {
  return (
    <SafeAreaView style={tw`flex-1 items-center`}>
      <View style={tw.style(`flex-1`, {
        marginTop: padding,
        width: screenWidth,
      })}>
        <Text>Capture Screen</Text>
        <Scanner />
      </View>
    </SafeAreaView >
  );
}

export default CaptureScreen;
