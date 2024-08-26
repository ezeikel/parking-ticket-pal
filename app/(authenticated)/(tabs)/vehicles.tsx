import { SafeAreaView, Text, View, Dimensions } from 'react-native';
import tw from "twrnc";
import VehiclesList from '@/components/VehiclesList/VehiclesList';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const VehiclesScreen = () => {
  return (
    <SafeAreaView style={tw`flex-1 items-center`}>
      <View style={tw.style(`flex-1`, {
        marginTop: padding,
        width: screenWidth,
      })}>
        <Text style={tw`font-bold text-3xl mb-4`}>Vehicles Screen</Text>
        <VehiclesList />
      </View>
    </SafeAreaView >
  );
}

export default VehiclesScreen;
