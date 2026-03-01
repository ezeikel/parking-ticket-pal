import { View, Text } from 'react-native';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faBell,
  faTicket,
  faFileLines,
  faCheckCircle,
  faSterlingSign,
  faChevronRight,
} from '@fortawesome/pro-regular-svg-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useMarkNotificationAsRead } from '@/hooks/api/useNotifications';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { perfect } from '@/styles';

type Notification = {
  id: string;
  userId: string;
  ticketId: string | null;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  ticket?: {
    id: string;
    pcnNumber: string;
    status: string;
  };
};

interface NotificationItemProps {
  notification: Notification;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'TICKET_DEADLINE_REMINDER':
      return faBell;
    case 'TICKET_STATUS_UPDATE':
      return faTicket;
    case 'FORM_DEADLINE_REMINDER':
      return faFileLines;
    case 'APPEAL_SUBMITTED':
    case 'CHALLENGE_COMPLETE':
    case 'APPEAL_RESPONSE_RECEIVED':
      return faCheckCircle;
    case 'PAYMENT_DUE':
      return faSterlingSign;
    default:
      return faBell;
  }
};

const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const [expanded, setExpanded] = useState(false);
  const icon = getNotificationIcon(notification.type);

  const handlePress = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    setExpanded((prev) => !prev);
  };

  const handleViewTicket = () => {
    if (notification.ticketId) {
      router.push(`/(authenticated)/ticket/${notification.ticketId}`);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <SquishyPressable
      onPress={handlePress}
      className="rounded-2xl p-4 mb-3 bg-white"
      style={perfect.cardShadow}
    >
      <View className="flex-row">
        {/* Icon */}
        <View className="w-11 h-11 rounded-full items-center justify-center mr-3 bg-gray-100">
          <FontAwesomeIcon icon={icon} size={18} color="#6B7280" />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Title row */}
          <View className="flex-row items-start justify-between mb-1">
            <Text
              className={`flex-1 text-base ${
                notification.read
                  ? 'font-jakarta text-gray-500'
                  : 'font-jakarta-bold text-dark'
              }`}
              numberOfLines={expanded ? undefined : 1}
            >
              {notification.title}
            </Text>
            {!notification.read && (
              <View className="w-2 h-2 bg-teal rounded-full ml-2 mt-2" />
            )}
          </View>

          {/* Body */}
          <Text
            className={`font-jakarta text-sm mb-2.5 ${
              notification.read ? 'text-gray-400' : 'text-gray-600'
            }`}
            numberOfLines={expanded ? undefined : 2}
          >
            {notification.body}
          </Text>

          {/* View ticket link (only when expanded and has a ticket) */}
          {expanded && notification.ticketId && (
            <SquishyPressable onPress={handleViewTicket}>
              <View className="flex-row items-center mb-2.5">
                <Text className="font-jakarta-semibold text-sm text-dark mr-1">
                  View ticket
                </Text>
                <FontAwesomeIcon icon={faChevronRight} size={10} color="#222222" />
              </View>
            </SquishyPressable>
          )}

          {/* Metadata */}
          <View className="flex-row items-center justify-between">
            <Text className={`font-jakarta text-xs ${notification.read ? 'text-gray-300' : 'text-gray-400'}`}>
              {timeAgo}
            </Text>
            {notification.ticket && (
              <View className="bg-gray-100 rounded-full px-2 py-0.5">
                <Text className="font-jakarta-medium text-xs text-gray-500">
                  {notification.ticket.pcnNumber}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SquishyPressable>
  );
};

export default NotificationItem;
