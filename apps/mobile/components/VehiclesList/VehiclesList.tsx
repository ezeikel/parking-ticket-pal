import { useCallback, memo } from 'react';
import { View, Text } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import useVehicles from '@/hooks/api/useVehicles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCarSide } from "@fortawesome/pro-regular-svg-icons";
import { Vehicle } from '@/types';
import { Typography } from '../Typography/Typography';
import Loader from '../Loader/Loader';

const gridGap = 16;
const vehicleItemStyle = { marginBottom: gridGap };
const vehicleItemLastStyle = { marginBottom: 0 };

const VehicleItem = memo(function VehicleItem({ vehicle, style }: {
  vehicle: Vehicle;
  style: Record<string, unknown>
}) {
  return (
    <View
      className="rounded-lg border border-[#e4e4e7] bg-white text-[#09090b] shadow-sm"
      style={style}
    >
      <View className="flex-row items-center p-4 gap-x-4">
        <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center">
          {/* Placeholder for vehicle brand logo */}
          <FontAwesomeIcon icon={faCarSide} size={24} color="#71717a" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-x-2">
            <Typography variant="vrm">{vehicle.vrm}</Typography>
            <Text className="font-jakarta text-lg">{vehicle.make}</Text>
          </View>
          <Text className="font-jakarta text-[#71717a]">
            {`${vehicle.model} ${vehicle.year}`}
          </Text>
        </View>
      </View>
    </View>
  );
});

const VehiclesList = () => {
  const { data: { vehicles } = {}, isLoading } = useVehicles();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    );
  }

  if (!vehicles || !vehicles.length) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>No vehicles found.</Text>
      </View>
    );
  }

  const renderItem = useCallback(({ item }: { item: Vehicle }) => (
    <VehicleItem
      vehicle={item}
      style={vehicleItemStyle}
    />
  ), []);

  return (
    <View className="flex-1 gap-y-6 p-4">
      <FlashList
        data={vehicles}
        renderItem={renderItem}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

export default VehiclesList;