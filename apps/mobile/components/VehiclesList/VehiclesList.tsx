import { View, Text } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import tw from "twrnc";
import useVehicles from '@/hooks/api/useVehicles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCarSide } from "@fortawesome/pro-regular-svg-icons";
import { Vehicle } from '@/types';
import { Typography } from '../Typography/Typography';

const gridGap = 16;

const VehicleItem = ({ vehicle, style }: {
  vehicle: Vehicle;
  style: Record<string, unknown>
}) => {
  return (
    <View style={tw.style(`rounded-lg border border-[#e4e4e7] bg-white text-[#09090b] shadow-sm`, {
      ...style
    })}>
      <View style={tw`flex-row items-center p-4 gap-x-4`}>
        <View style={tw`w-12 h-12 bg-gray-100 rounded-full items-center justify-center`}>
          {/* Placeholder for vehicle brand logo */}
          <FontAwesomeIcon icon={faCarSide} size={24} color="#71717a" />
        </View>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center gap-x-2`}>
            <Text style={tw`font-semibold text-lg`}>{vehicle.vrm}</Text>
            <Typography variant="vrm">{vehicle.vrm}</Typography>
            <Text style={tw`text-lg`}>{vehicle.make}</Text>
          </View>
          <Text style={tw`text-[#71717a]`}>
            {`${vehicle.model} ${vehicle.year}`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const VehiclesList = () => {
  const { data: { vehicles } = {}, isLoading } = useVehicles();

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!vehicles || !vehicles.length) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <Text>No vehicles found.</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 gap-y-6 p-4`}>
      <FlashList
        data={vehicles}
        renderItem={({ item, index }) => {
          const isLastRow =
            Math.floor(index) ===
            Math.floor(vehicles.length - 1);

          return (
            <VehicleItem
              vehicle={item}
              style={tw.style({
                marginBottom: isLastRow ? 0 : gridGap,
              })}
            />
          );
        }}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

export default VehiclesList;