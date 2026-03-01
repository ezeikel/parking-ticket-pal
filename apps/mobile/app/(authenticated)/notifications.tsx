import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/pro-regular-svg-icons';
import NotificationList from '@/components/NotificationList';
import { useNotifications } from '@/hooks/api/useNotifications';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type FilterType = 'all' | 'unread';

const NotificationsScreen = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data } = useNotifications();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pb-4">
        <View className="flex-row justify-between items-center mb-3">
          <SquishyPressable onPress={() => router.back()}>
            <View className="flex-row items-center">
              <FontAwesomeIcon icon={faChevronLeft} size={16} color="#222222" />
              <Text className="ml-1.5 text-base font-jakarta text-dark">Back</Text>
            </View>
          </SquishyPressable>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-jakarta-bold text-dark">
            Notifications
          </Text>
          {data?.unreadCount ? (
            <View className="bg-dark rounded-full min-w-[24px] h-6 items-center justify-center px-2">
              <Text className="text-white text-xs font-jakarta-bold">
                {data.unreadCount > 99 ? '99+' : data.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <View className="flex-row bg-gray-50 border border-gray-200 rounded-xl p-1">
          <View className="flex-1">
            <SquishyPressable
              onPress={() => setFilter('all')}
            >
              <View
                className={`py-2.5 rounded-lg ${filter === 'all' ? 'bg-white' : ''}`}
                style={filter === 'all' ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                  elevation: 1,
                } : undefined}
              >
                <Text
                  className={`text-sm text-center ${
                    filter === 'all'
                      ? 'text-dark font-jakarta-semibold'
                      : 'text-gray-500 font-jakarta'
                  }`}
                >
                  All
                </Text>
              </View>
            </SquishyPressable>
          </View>

          <View className="flex-1">
            <SquishyPressable
              onPress={() => setFilter('unread')}
            >
              <View
                className={`py-2.5 rounded-lg ${filter === 'unread' ? 'bg-white' : ''}`}
                style={filter === 'unread' ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                  elevation: 1,
                } : undefined}
              >
                <Text
                  className={`text-sm text-center ${
                    filter === 'unread'
                      ? 'text-dark font-jakarta-semibold'
                      : 'text-gray-500 font-jakarta'
                  }`}
                >
                  Unread
                </Text>
              </View>
            </SquishyPressable>
          </View>
        </View>
      </View>

      <View className="flex-1 bg-gray-50">
        {/* Notification List */}
        <NotificationList unreadOnly={filter === 'unread'} />
      </View>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
