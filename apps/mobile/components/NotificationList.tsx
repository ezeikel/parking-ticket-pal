import { View, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useCallback } from 'react';
import { useNotifications } from '@/hooks/api/useNotifications';
import NotificationItem from './NotificationItem';
import { faBell } from '@fortawesome/pro-regular-svg-icons';
import Loader from './Loader/Loader';
import EmptyState from './EmptyState/EmptyState';
import CustomRefreshControl from './CustomRefreshControl/CustomRefreshControl';

interface NotificationListProps {
  unreadOnly?: boolean;
}

const NotificationList = ({ unreadOnly = false }: NotificationListProps) => {
  const { data, isLoading, isRefetching, refetch } = useNotifications({ unreadOnly });

  const notifications = data?.notifications || [];

  const renderNotificationItem = useCallback(
    ({ item }: { item: (typeof notifications)[number] }) => <NotificationItem notification={item} />,
    [],
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 items-center justify-center"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <CustomRefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        <EmptyState
          icon={faBell}
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description={
            unreadOnly
              ? "You're all caught up! Check back later for updates on your parking tickets."
              : "When you receive notifications about your parking tickets, they'll appear here."
          }
        />
      </ScrollView>
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
        <CustomRefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
    />
  );
};

export default NotificationList;
