import { SafeAreaView, Text, View, Dimensions } from 'react-native';
import tw from "twrnc";

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const RecentsScreen = () => {
  return (
    <SafeAreaView style={tw`flex-1 items-center`}>
      <View style={tw.style(`flex-1`, {
        marginTop: padding,
        width: screenWidth,
      })}>
        <Text style={tw`font-bold text-3xl mb-4`}>Recents Screen</Text>
      </View>
    </SafeAreaView >
  );
}

export default RecentsScreen;
