import { View, Text } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import tw from "twrnc";
import useVehicles from '@/hooks/api/useVehicles';

const gridGap = 16;

const VehiclesList = () => {
  const { data: { vehicles } = {}, isLoading } = useVehicles();

  if (isLoading) {
    return (
      <Text>Loading...</Text>
    )
  }

  if (!vehicles || !vehicles.length) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <Text>No vehicles found.</Text>
      </View>
    )
  }

  return (
    <FlashList
      data={vehicles}
      renderItem={({ item, index }) => {

        const isLastRow =
          Math.floor(index) ===
          Math.floor(vehicles.length - 1);

        return (
          <View style={tw.style({
            marginBottom: isLastRow ? 0 : gridGap,
          })}>
            <Text>{item.registration}</Text>
            <Text>{item.make} {item.model}</Text>
          </View>
        )
      }}
      estimatedItemSize={100}
      keyExtractor={(item) => item.id.toString()}
    />
  )
}

export default VehiclesList;