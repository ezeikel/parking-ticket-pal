import { useCallback, memo } from 'react';
import { View, Text } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import useVehicles from '@/hooks/api/useVehicles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCar } from "@fortawesome/pro-solid-svg-icons";
import { Vehicle } from '@/types';
import { Typography } from '../Typography/Typography';
import Loader from '../Loader/Loader';
import EmptyState from '../EmptyState/EmptyState';

const gridGap = 16;
const vehicleItemStyle = { marginBottom: gridGap };

const ACTIVE_TICKET_STATUSES = [
  'ISSUED_DISCOUNT_PERIOD',
  'ISSUED_FULL_CHARGE',
  'NOTICE_TO_OWNER',
  'FORMAL_REPRESENTATION',
  'NOTICE_OF_REJECTION',
  'REPRESENTATION_ACCEPTED',
  'CHARGE_CERTIFICATE',
  'ORDER_FOR_RECOVERY',
  'TEC_OUT_OF_TIME_APPLICATION',
  'PE2_PE3_APPLICATION',
  'APPEAL_TO_TRIBUNAL',
  'ENFORCEMENT_BAILIFF_STAGE',
  'NOTICE_TO_KEEPER',
  'APPEAL_SUBMITTED_TO_OPERATOR',
  'APPEAL_REJECTED_BY_OPERATOR',
  'POPLA_APPEAL',
  'IAS_APPEAL',
  'APPEAL_UPHELD',
  'APPEAL_REJECTED',
  'DEBT_COLLECTION',
  'COURT_PROCEEDINGS',
  'CCJ_ISSUED',
];

const URGENT_TICKET_STATUSES = [
  'ISSUED_FULL_CHARGE',
  'CHARGE_CERTIFICATE',
  'ORDER_FOR_RECOVERY',
  'ENFORCEMENT_BAILIFF_STAGE',
  'APPEAL_REJECTED',
  'DEBT_COLLECTION',
  'COURT_PROCEEDINGS',
  'CCJ_ISSUED',
];

const VehicleItem = memo(function VehicleItem({ vehicle, style }: {
  vehicle: Vehicle;
  style: Record<string, unknown>
}) {
  const activeTickets = vehicle.tickets?.filter((t) =>
    ACTIVE_TICKET_STATUSES.includes(t.status),
  ).length ?? 0;

  const urgentTickets = vehicle.tickets?.filter((t) =>
    URGENT_TICKET_STATUSES.includes(t.status),
  ).length ?? 0;

  const vehicleName =
    vehicle.make && vehicle.model
      ? `${vehicle.make} ${vehicle.model}`
      : 'Unknown Vehicle';

  const ticketText =
    activeTickets === 0
      ? 'No active tickets'
      : activeTickets === 1
        ? '1 active ticket'
        : `${activeTickets} active tickets`;

  return (
    <View
      className="rounded-xl bg-white shadow-sm overflow-hidden"
      style={style}
    >
      {/* Car illustration area */}
      <View className="items-center justify-center bg-gray-50 py-8 relative">
        <FontAwesomeIcon icon={faCar} size={48} color="#e4e4e7" />

        {/* Urgent badge */}
        {urgentTickets > 0 && (
          <View className="absolute top-3 left-3 flex-row items-center bg-red-500 rounded-full px-2.5 py-1 gap-x-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-white" />
            <Text className="text-white text-xs font-jakarta-semibold">
              {urgentTickets} urgent
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="p-4 gap-y-1">
        {/* Registration plate */}
        <View className="self-start bg-[#FFD500] rounded px-2 py-0.5 mb-1">
          <Typography font="uknumberplate" size="sm" weight="bold" style={{ color: '#222222' }}>{vehicle.registrationNumber || vehicle.vrm}</Typography>
        </View>

        {/* Vehicle name + year */}
        <Text className="font-jakarta-semibold text-base text-dark">
          {vehicleName}
          {vehicle.year ? (
            <Text className="font-jakarta font-normal text-gray-500"> ({vehicle.year})</Text>
          ) : null}
        </Text>

        {/* Ticket count */}
        <Text className="font-jakarta text-sm text-gray-500">{ticketText}</Text>
      </View>
    </View>
  );
});

const VehiclesList = () => {
  const { data: { vehicles } = {}, isLoading } = useVehicles();

  const renderItem = useCallback(({ item }: { item: Vehicle }) => (
    <VehicleItem
      vehicle={item}
      style={vehicleItemStyle}
    />
  ), []);

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
        <EmptyState
          icon={faCar}
          title="No vehicles yet"
          description="Add a vehicle to link it with your parking tickets"
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList
        data={vehicles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        estimatedItemSize={200}
      />
    </View>
  );
};

export default VehiclesList;
