import { View, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehiclesList from '@/components/VehiclesList/VehiclesList';
import NotificationBell from '@/components/NotificationBell';
import { AdBanner } from '@/components/AdBanner';
import { MAX_CONTENT_WIDTH } from '@/constants/layout';

const padding = 16;

const VehiclesScreen = () => {
  const { width } = useWindowDimensions();
  const screenWidth = width - padding * 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View className="bg-white border-b border-gray-200 px-4 pb-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-jakarta-bold text-dark">Vehicles</Text>
          <NotificationBell />
        </View>
      </View>
      <AdBanner placement="vehicles" />
      <View className="flex-1 bg-gray-50">
        <View
          className="flex-1"
          style={{ marginTop: padding, width: screenWidth, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }}
        >
          <VehiclesList />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default VehiclesScreen;
