import { View, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useState, useCallback } from 'react';
import { useNotifications } from '@/hooks/api/useNotifications';
import NotificationItem from './NotificationItem';
import { faBell } from '@fortawesome/pro-regular-svg-icons';
import Loader from './Loader/Loader';
import EmptyState from './EmptyState/EmptyState';

interface NotificationListProps {
  unreadOnly?: boolean;
}

const NotificationList = ({ unreadOnly = false }: NotificationListProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useNotifications({ unreadOnly });

  const notifications = data?.notifications || [];

  const renderNotificationItem = useCallback(
    ({ item }: { item: (typeof notifications)[number] }) => <NotificationItem notification={item} />,
    [],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={faBell}
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description={
            unreadOnly
              ? "You're all caught up! Check back later for updates on your parking tickets."
              : "When you receive notifications about your parking tickets, they'll appear here."
          }
        />
      </View>
    );
  }

  return (
    <FlashList
      data={notifications}
      renderItem={renderNotificationItem}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.read ? 'read' : 'unread'}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
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
