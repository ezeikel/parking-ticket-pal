import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faBell,
  faTicket,
  faFileLines,
  faCheckCircle,
  faDollarSign,
} from '@fortawesome/pro-regular-svg-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useMarkNotificationAsRead } from '@/hooks/api/useNotifications';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

const AnimatedSquishyPressable = Animated.createAnimatedComponent(SquishyPressable);

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
      return { icon: faBell, color: '#d97706' };
    case 'TICKET_STATUS_UPDATE':
      return { icon: faTicket, color: '#2563eb' };
    case 'FORM_DEADLINE_REMINDER':
      return { icon: faFileLines, color: '#d97706' };
    case 'APPEAL_SUBMITTED':
    case 'CHALLENGE_COMPLETE':
      return { icon: faCheckCircle, color: '#16a34a' };
    case 'PAYMENT_DUE':
      return { icon: faDollarSign, color: '#dc2626' };
    default:
      return { icon: faBell, color: '#6b7280' };
  }
};

const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const scale = useSharedValue(1);
  const { icon, color } = getNotificationIcon(notification.type);

  const handlePress = () => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to ticket if available
    if (notification.ticketId) {
      router.push(`/(authenticated)/ticket/${notification.ticketId}`);
    }
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <AnimatedSquishyPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`bg-white rounded-lg p-4 mb-3 border ${
        notification.read ? 'border-gray-100' : 'border-blue-200 bg-blue-50'
      }`}
      style={animatedStyle}
    >
      <View className="flex-row">
        {/* Icon */}
        <View
          className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${
            notification.read ? 'bg-gray-100' : 'bg-blue-100'
          }`}
        >
          <FontAwesomeIcon
            icon={icon}
            size={18}
            color={color}
          />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Title and timestamp */}
          <View className="flex-row items-start justify-between mb-1">
            <Text
              className={`flex-1 font-inter text-base ${
                notification.read ? 'text-gray-900' : 'text-gray-900 font-inter-bold'
              }`}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {!notification.read && (
              <View className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2" />
            )}
          </View>

          {/* Body */}
          <Text
            className={`font-inter text-sm mb-2 ${
              notification.read ? 'text-gray-600' : 'text-gray-700'
            }`}
            numberOfLines={2}
          >
            {notification.body}
          </Text>

          {/* Metadata */}
          <View className="flex-row items-center justify-between">
            <Text className="font-inter text-xs text-gray-500">
              {timeAgo}
            </Text>

            {notification.ticket && (
              <Text className="font-inter text-xs text-gray-500">
                {notification.ticket.pcnNumber}
              </Text>
            )}
          </View>
        </View>
      </View>
    </AnimatedSquishyPressable>
  );
};

export default NotificationItem;
