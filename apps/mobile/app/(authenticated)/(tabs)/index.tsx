import { View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import TicketsList from '@/components/TicketList/TicketsList';
import { Typography } from '@/components/Typography/Typography';
import { useAnalytics } from '@/lib/analytics';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const TicketsScreen = () => {
  const { trackScreenView, trackEvent } = useAnalytics();

  useFocusEffect(
    useCallback(() => {
      trackScreenView('tickets_list');
      trackEvent("ticket_list_viewed", { screen: "tickets_list" });
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 items-center">
      <View
        className="flex-1"
        style={{
          marginTop: padding,
          width: screenWidth,
        }}
      >
        <TicketsList />
      </View>
    </SafeAreaView>
  );
}

export default TicketsScreen;
