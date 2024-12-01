import { SafeAreaView, Text, View, Dimensions, Button } from 'react-native';
import tw from "twrnc";
import TicketsList from '@/components/TicketList/TicketsList';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const TicketsScreen = () => {
  return (
    <SafeAreaView style={tw`flex-1 items-center`}>
      <View style={tw.style(`flex-1`, {
        marginTop: padding,
        width: screenWidth,
      })}>
        <Text style={tw`font-bold text-3xl mb-4`}>Tickets Screen</Text>
        <TicketsList />
      </View>
    </SafeAreaView>
  );
}

export default TicketsScreen;
