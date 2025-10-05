import { useEffect, useState } from 'react';
import { Pressable, Text, View, Alert } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleExclamation,
  faClock,
  faCarSide,
  faCalendar,
  faMoneyBill,
  faMapMarkerAlt,
  faTrash
} from "@fortawesome/pro-regular-svg-icons";
import {
  differenceInMinutes, differenceInHours, differenceInDays,
  differenceInMilliseconds, parseISO, addDays, format
} from 'date-fns';
import useTickets from '@/hooks/api/useTickets';
import { Ticket, TicketStatus, Address } from '@/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Loader from '@/components/Loader/Loader';

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
      <Text className="text-sm font-medium text-red-600">
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

  const statusColors = getStatusColor(ticket.status);
  const formattedDate = format(new Date(ticket.issuedAt), 'MMM d, yyyy');
  const dueDateFormatted = format(paymentDeadline, 'MMM d');

  // Calculate amount due (simplified - assuming discount period logic)
  const baseAmount = ticket.initialAmount || 60;
  const discountAmount = Math.round(baseAmount * 0.5);
  const currentAmount = isDiscountPeriod ? discountAmount : baseAmount;

  // Check if ticket is urgent (less than 48 hours to deadline)
  const timeUntilDeadline = differenceInMilliseconds(paymentDeadline, new Date());
  const isUrgent = timeUntilDeadline < DISCOUNT_THRESHOLD_MS && timeUntilDeadline > 0;

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
    <View
      className={`rounded-lg bg-white shadow-sm ${
        isUrgent ? 'border-2 border-red-300' : 'border border-gray-200'
      }`}
      style={style}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between p-4 pb-2">
        <View className="flex-1">
          <Text className="font-inter font-bold text-lg text-gray-900 mb-1">
            {ticket.pcnNumber}
          </Text>
          <Text className="font-inter text-sm text-gray-600">
            {ticket.issuer}
          </Text>
        </View>
        <Pressable onPress={handleDelete} className="p-2">
          <FontAwesomeIcon
            icon={faTrash}
            size={18}
            color="#dc2626"
          />
        </Pressable>
      </View>

      {/* Status Badge */}
      <View className="px-4 pb-3">
        <View
          className="rounded-full px-3 py-1 self-start"
          style={{ backgroundColor: statusColors.bg }}
        >
          <Text
            className="font-inter text-xs font-medium"
            style={{ color: statusColors.text }}
          >
            {ticket.status.replace(/_/g, ' ')}
          </Text>
        </View>
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
            <Text className="font-inter text-sm text-gray-700">
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
            <Text className="font-inter text-sm text-gray-700">
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
            <Text className="font-inter text-sm font-semibold text-gray-900">
              £{currentAmount}
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
            <Text className="font-inter text-sm text-gray-700">
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
              <Text className="font-inter text-sm text-gray-700 flex-1" numberOfLines={1}>
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
  );
};

const TicketsList = () => {
  const { data: { tickets } = {}, isLoading } = useTickets();

  const handleDeleteTicket = (ticketId: string) => {
    // TODO: Implement delete API call
    console.log('Delete ticket:', ticketId);
    Alert.alert('Success', 'Ticket deleted successfully');
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    );
  }

  if (!tickets || !tickets.length) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="font-inter text-lg text-gray-600 text-center mb-2">
          No tickets yet
        </Text>
        <Text className="font-inter text-sm text-gray-500 text-center">
          Use the camera button to capture your first parking ticket
        </Text>
      </View>
    );
  }

  // Check for upcoming deadlines
  const hasUpcomingDeadlines = tickets.some(ticket => {
    const estimatedFullPaymentDeadline = addDays(new Date(ticket.issuedAt), 28);
    return differenceInMilliseconds(estimatedFullPaymentDeadline, new Date()) < DISCOUNT_THRESHOLD_MS;
  });

  // Sort tickets by urgency (most urgent first)
  const sortedTickets = tickets.sort((a, b) => {
    const aDeadline = addDays(new Date(a.issuedAt), a.status === TicketStatus.ISSUED_DISCOUNT_PERIOD ? 14 : 28);
    const bDeadline = addDays(new Date(b.issuedAt), b.status === TicketStatus.ISSUED_DISCOUNT_PERIOD ? 14 : 28);
    return aDeadline.getTime() - bDeadline.getTime();
  });

  return (
    <View className="flex-1">
      <FlashList
        data={sortedTickets}
        renderItem={({ item, index }) => {
          const isLastRow = index === sortedTickets.length - 1;
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
      />
    </View>
  );
};

export default TicketsList;