import { useCallback, useEffect, useState } from 'react';
import { Text, View, Alert, RefreshControl, ScrollView } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faClock,
  faCarSide,
  faCalendar,
  faMoneyBill,
  faMapMarkerAlt,
  faTrashCan
} from "@fortawesome/pro-regular-svg-icons";
import {
  differenceInMinutes, differenceInHours, differenceInDays,
  differenceInMilliseconds, parseISO, addDays, format
} from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import useTickets from '@/hooks/api/useTickets';
import { Ticket, TicketStatus } from '@/types';
import { deleteTicket, type TicketFilters } from '@/api';

type TicketTier = 'FREE' | 'STANDARD' | 'PREMIUM';
import { Address } from '@parking-ticket-pal/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

interface TicketsListProps {
  filters?: TicketFilters;
}

const DISCOUNT_THRESHOLD_MS = 172800000; // 48 hours in milliseconds

const gridGap = 16;

type CountdownTimerProps = {
  deadline: string;
};

const CountdownTimer = ({ deadline }: CountdownTimerProps) => {
  const calculateTimeLeft = (deadline: string) => {
    const now = new Date();
    const targetDate = parseISO(deadline);

    const days = differenceInDays(targetDate, now);
    const hours = differenceInHours(targetDate, now) % 24;
    const minutes = differenceInMinutes(targetDate, now) % 60;

    return { days, hours, minutes };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [deadline]);

  const { days, hours, minutes } = timeLeft;

  if (days <= 0 && hours <= 0 && minutes <= 0) return null;

  return (
    <View className="flex-row items-center">
      <FontAwesomeIcon icon={faClock} size={14} color="#dc2626" style={{ marginRight: 6 }} />
      <Text className="text-sm font-jakarta-medium text-red-600">
        {days > 0 ? `${days}d ${hours}h left` : `${hours}h ${minutes}m left`}
      </Text>
    </View>
  );
};

const TicketItem = ({ ticket, style, onDelete }: {
  ticket: Ticket;
  style: Record<string, unknown>;
  onDelete: (ticketId: string) => void;
}) => {
  const colorScheme = useColorScheme();

  // Calculate estimated payment deadline based on issued date
  const estimatedFullPaymentDeadline = addDays(new Date(ticket.issuedAt), 28);
  const estimatedDiscountDeadline = addDays(new Date(ticket.issuedAt), 14);
  const isDiscountPeriod = ticket.status === TicketStatus.ISSUED_DISCOUNT_PERIOD;
  const paymentDeadline = isDiscountPeriod ? estimatedDiscountDeadline : estimatedFullPaymentDeadline;

  // Status badge colors
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PAID:
      case TicketStatus.REPRESENTATION_ACCEPTED:
      case TicketStatus.APPEAL_UPHELD:
        return { bg: '#dcfce7', text: '#16a34a' }; // green
      case TicketStatus.ISSUED_DISCOUNT_PERIOD:
      case TicketStatus.ISSUED_FULL_CHARGE:
      case TicketStatus.NOTICE_TO_OWNER:
        return { bg: '#fef3c7', text: '#d97706' }; // yellow
      case TicketStatus.CHARGE_CERTIFICATE:
      case TicketStatus.ORDER_FOR_RECOVERY:
      case TicketStatus.ENFORCEMENT_BAILIFF_STAGE:
        return { bg: '#fee2e2', text: '#dc2626' }; // red
      default:
        return { bg: '#f3f4f6', text: '#6b7280' }; // gray
    }
  };

  // Get ticket data with type assertion since mobile types are outdated
  const ticketData = ticket as any;

  const statusColors = getStatusColor(ticket.status);
  const formattedDate = format(new Date(ticket.issuedAt), 'MMM d, yyyy');
  const dueDateFormatted = format(paymentDeadline, 'MMM d');

  // Calculate amount (initialAmount is stored in pennies, convert to pounds)
  const amountInPennies = ticketData.initialAmount || 6000; // Default to £60 (6000 pennies)
  const amount = amountInPennies / 100;

  // Check if ticket is urgent (less than 48 hours to deadline)
  const timeUntilDeadline = differenceInMilliseconds(paymentDeadline, new Date());
  const isUrgent = timeUntilDeadline < DISCOUNT_THRESHOLD_MS && timeUntilDeadline > 0;

  // Get ticket tier
  const tier: TicketTier = ticketData.tier || 'FREE';

  // Tier badge colors
  const getTierColor = (tier: TicketTier) => {
    switch (tier) {
      case 'STANDARD':
        return { bg: '#dbeafe', text: '#2563eb' }; // blue
      case 'PREMIUM':
        return { bg: '#f3e8ff', text: '#9333ea' }; // purple
      default:
        return null; // Don't show badge for FREE
    }
  };

  const tierColors = getTierColor(tier);

  const handleDelete = () => {
    Alert.alert(
      'Delete Ticket',
      `Are you sure you want to delete ticket ${ticket.pcnNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(ticket.id)
        }
      ]
    );
  };

  return (
    <SquishyPressable
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      style={style}
    >
      <View
        className={`rounded-lg bg-white shadow-sm ${
          isUrgent ? 'border-2 border-red-300' : 'border border-gray-200'
        }`}
      >
      {/* Header */}
      <View className="flex-row items-start justify-between p-4 pb-2">
        <View className="flex-1">
          <Text className="font-jakarta-bold text-lg text-gray-900 mb-1">
            {ticket.pcnNumber}
          </Text>
          <Text className="font-jakarta text-sm text-gray-600">
            {ticket.issuer}
          </Text>
        </View>
        <SquishyPressable onPress={handleDelete} className="p-2">
          <FontAwesomeIcon
            icon={faTrashCan}
            size={18}
            color="#dc2626"
          />
        </SquishyPressable>
      </View>

      {/* Status Badge & Tier Indicator */}
      <View className="px-4 pb-3 flex-row items-center justify-between">
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: statusColors.bg }}
        >
          <Text
            className="font-jakarta-medium text-xs"
            style={{ color: statusColors.text }}
          >
            {ticket.status.replace(/_/g, ' ')}
          </Text>
        </View>

        {/* Tier Badge - only show for STANDARD/PREMIUM */}
        {tierColors && (
          <View
            className="rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: tierColors.bg }}
          >
            <Text
              className="font-jakarta-semibold text-xs"
              style={{ color: tierColors.text }}
            >
              {tier}
            </Text>
          </View>
        )}
      </View>

      {/* Details Grid */}
      <View className="px-4 pb-4">
        <View className="flex-row flex-wrap gap-y-3">
          {/* Vehicle */}
          <View className="flex-row items-center w-1/2">
            <FontAwesomeIcon
              icon={faCarSide}
              size={14}
              color="#6b7280"
              style={{ marginRight: 8 }}
            />
            <Text className="font-jakarta text-sm text-gray-700">
              {ticket.vehicle?.registrationNumber || 'N/A'}
            </Text>
          </View>

          {/* Date Issued */}
          <View className="flex-row items-center w-1/2">
            <FontAwesomeIcon
              icon={faCalendar}
              size={14}
              color="#6b7280"
              style={{ marginRight: 8 }}
            />
            <Text className="font-jakarta text-sm text-gray-700">
              {formattedDate}
            </Text>
          </View>

          {/* Amount Due */}
          <View className="flex-row items-center w-1/2">
            <FontAwesomeIcon
              icon={faMoneyBill}
              size={14}
              color="#6b7280"
              style={{ marginRight: 8 }}
            />
            <Text className="font-jakarta-semibold text-sm text-gray-900">
              £{amount.toFixed(2)}
            </Text>
          </View>

          {/* Due Date */}
          <View className="flex-row items-center w-1/2">
            <FontAwesomeIcon
              icon={faClock}
              size={14}
              color="#6b7280"
              style={{ marginRight: 8 }}
            />
            <Text className="font-jakarta text-sm text-gray-700">
              Due {dueDateFormatted}
            </Text>
          </View>

          {/* Location */}
          {ticket.location && (
            <View className="flex-row items-center w-full mt-1">
              <FontAwesomeIcon
                icon={faMapMarkerAlt}
                size={14}
                color="#6b7280"
                style={{ marginRight: 8 }}
              />
              <Text className="font-jakarta text-sm text-gray-700 flex-1" numberOfLines={1}>
                {(ticket.location as Address)?.line1 || 'Location not specified'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Countdown Timer */}
      <View className="px-4 pb-4">
        <CountdownTimer deadline={paymentDeadline.toISOString()} />
      </View>
      </View>
    </SquishyPressable>
  );
};

const TicketsList = ({ filters }: TicketsListProps) => {
  const { data: { tickets } = {}, isLoading, refetch, isRefetching } = useTickets(filters);
  const queryClient = useQueryClient();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteTicket(ticketId);
      // Invalidate and refetch tickets
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      Alert.alert('Success', 'Ticket deleted successfully');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      Alert.alert('Error', 'Failed to delete ticket. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    );
  }

  if (!tickets || !tickets.length) {
    const hasActiveFilters = filters?.search ||
                             (filters?.status && filters.status.length > 0) ||
                             (filters?.issuerType && filters.issuerType.length > 0) ||
                             (filters?.ticketType && filters.ticketType.length > 0);

    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 items-center justify-center px-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        <Text className="font-jakarta text-lg text-gray-600 text-center mb-2">
          {hasActiveFilters ? 'No tickets found' : 'No tickets yet'}
        </Text>
        <Text className="font-jakarta text-sm text-gray-500 text-center">
          {hasActiveFilters
            ? 'Try adjusting your filters or search terms'
            : 'Use the camera button to capture your first parking ticket'
          }
        </Text>
      </ScrollView>
    );
  }

  // Note: Sorting is now handled by the backend based on filters.sortBy and filters.sortOrder
  // Only apply client-side sorting if no sortBy is specified (for backward compatibility)
  const displayTickets = !filters?.sortBy
    ? [...tickets].sort((a, b) => {
        const aDeadline = addDays(new Date(a.issuedAt), a.status === TicketStatus.ISSUED_DISCOUNT_PERIOD ? 14 : 28);
        const bDeadline = addDays(new Date(b.issuedAt), b.status === TicketStatus.ISSUED_DISCOUNT_PERIOD ? 14 : 28);
        return aDeadline.getTime() - bDeadline.getTime();
      })
    : tickets;

  // Show result count if search or filters are active
  const hasSearch = !!filters?.search;
  const hasFilters = (filters?.status && filters.status.length > 0) ||
                     (filters?.issuers && filters.issuers.length > 0) ||
                     (filters?.issuerType && filters.issuerType.length > 0) ||
                     (filters?.ticketType && filters.ticketType.length > 0);
  const showResultCount = hasSearch || hasFilters;

  return (
    <View className="flex-1">
      {showResultCount && (
        <View className="mb-3">
          <Text className="font-jakarta text-sm text-gray-600">
            Found {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
            {hasSearch && ` matching "${filters.search}"`}
          </Text>
        </View>
      )}
      <FlashList
        data={displayTickets}
        renderItem={({ item, index }) => {
          const isLastRow = index === displayTickets.length - 1;
          return (
            <TicketItem
              ticket={item}
              onDelete={handleDeleteTicket}
              style={{
                marginHorizontal: 16,
                marginBottom: isLastRow ? 16 : gridGap,
              }}
            />
          );
        }}
        estimatedItemSize={200}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

export default TicketsList;