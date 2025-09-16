import { View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TicketsList from '@/components/TicketList/TicketsList';
import { Typography } from '@/components/Typography/Typography';

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
        <Typography
          font="lato"
          italic
          size="3xl"
          className="mb-4"
        >
          Tickets Screen abcefg
        </Typography>
        <TicketsList />
      </View>
    </SafeAreaView>
  );
}

export default TicketsScreen;
