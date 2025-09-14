import { SafeAreaView, Text, View, Dimensions } from 'react-native';
import VehiclesList from '@/components/VehiclesList/VehiclesList';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const VehiclesScreen = () => {
  return (
    <SafeAreaView className="flex-1 items-center">
      <View
        className="flex-1"
        style={{
          marginTop: padding,
          width: screenWidth,
        }}
      >
        <Text className="font-lato font-bold text-3xl mb-4">Vehicles Screen</Text>
        <VehiclesList />
      </View>
    </SafeAreaView >
  );
}

export default VehiclesScreen;
