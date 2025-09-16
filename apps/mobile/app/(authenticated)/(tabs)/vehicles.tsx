import { View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehiclesList from '@/components/VehiclesList/VehiclesList';
import { Typography } from '@/components/Typography/Typography';

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
        <Typography
          font="lato"
          size="3xl"
          className="mb-4"
        >
          Vehicles Screen
        </Typography>
        <VehiclesList />
      </View>
    </SafeAreaView >
  );
}

export default VehiclesScreen;
