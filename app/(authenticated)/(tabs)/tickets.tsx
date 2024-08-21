import { SafeAreaView, Text, View, Dimensions } from 'react-native';
import tw from "twrnc";
import { FlashList } from "@shopify/flash-list";
import useTickets from '@/hooks/api/useTickets';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const TicketsScreen = () => {
  const { data: { tickets } = {}, isLoading } = useTickets();

  return (
    <SafeAreaView style={tw`flex-1 items-center`}>
      <View style={tw.style(`flex-1`, {
        marginTop: padding,
        width: screenWidth,
      })}>
        <Text style={tw`font-bold text-3xl mb-4`}>Tickets Screen</Text>
        {isLoading ? <Text>Loading...</Text> : (
          <FlashList
            data={tickets}
            renderItem={({ item }) => {
              return (
                <View style={tw`p-4 bg-gray-100 rounded-lg mt-2`}>
                  <Text style={tw`text-lg`}>{item.pcnNumber}</Text>
                  <Text style={tw`text-sm`}>{item.issuer}</Text>
                </View>
              )
            }}
            estimatedItemSize={100}
            keyExtractor={(item) => item.id.toString()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

export default TicketsScreen;
