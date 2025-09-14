import { Text, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TicketsList from '@/components/TicketList/TicketsList';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const TicketsScreen = () => {
  return (
    <SafeAreaView className="flex-1 items-center">
      <View
        className="flex-1"
        style={{
          marginTop: padding,
          width: screenWidth,
        }}
      >
        <Text className="font-inter font-bold text-3xl mb-4">Tickets Screen</Text>
        <TicketsList />
      </View>
    </SafeAreaView>
  );
}

export default TicketsScreen;
