import { View, Text, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useNotifications } from '@/hooks/api/useNotifications';
import NotificationItem from './NotificationItem';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell } from '@fortawesome/pro-regular-svg-icons';
import Loader from './Loader/Loader';

interface NotificationListProps {
  unreadOnly?: boolean;
}

const NotificationList = ({ unreadOnly = false }: NotificationListProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useNotifications({ unreadOnly });

  const notifications = data?.notifications || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
          <FontAwesomeIcon icon={faBell} size={32} color="#9ca3af" />
        </View>
        <Text className="font-jakarta-semibold text-lg text-gray-900 mb-2 text-center">
          {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
        </Text>
        <Text className="font-jakarta text-sm text-gray-600 text-center">
          {unreadOnly
            ? 'You\'re all caught up! Check back later for updates on your parking tickets.'
            : 'When you receive notifications about your parking tickets, they\'ll appear here.'}
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={notifications}
      renderItem={({ item }) => <NotificationItem notification={item} />}
      estimatedItemSize={100}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#1ABC9C"
          colors={['#1ABC9C']}
        />
      }
    />
  );
};

export default NotificationList;
