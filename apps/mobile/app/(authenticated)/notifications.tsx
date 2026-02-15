import { View, Text, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/pro-regular-svg-icons';
import NotificationList from '@/components/NotificationList';
import { useNotifications } from '@/hooks/api/useNotifications';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

type FilterType = 'all' | 'unread';

const NotificationsScreen = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data } = useNotifications();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pb-4">
        <View className="flex-row justify-between items-center mb-4">
          <SquishyPressable onPress={() => router.back()}>
            <View className="flex-row items-center">
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#6b7280" />
              <Text className="ml-2 text-gray-600">Back</Text>
            </View>
          </SquishyPressable>
        </View>

        <Text className="text-2xl font-jakarta-bold text-dark mb-4">
          Notifications
        </Text>

        {/* Filter Tabs */}
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          <SquishyPressable
            onPress={() => setFilter('all')}
            className={`flex-1 py-2 rounded-lg ${
              filter === 'all' ? 'bg-white' : ''
            }`}
          >
            <Text
              className={`font-jakarta text-sm text-center ${
                filter === 'all'
                  ? 'text-gray-900 font-jakarta-bold'
                  : 'text-gray-600'
              }`}
            >
              All
            </Text>
          </SquishyPressable>

          <SquishyPressable
            onPress={() => setFilter('unread')}
            className={`flex-1 py-2 rounded-lg ${
              filter === 'unread' ? 'bg-white' : ''
            }`}
          >
            <View className="flex-row items-center justify-center">
              <Text
                className={`font-jakarta text-sm ${
                  filter === 'unread'
                    ? 'text-gray-900 font-jakarta-bold'
                    : 'text-gray-600'
                }`}
              >
                Unread
              </Text>
              {data?.unreadCount ? (
                <View className="ml-2 bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
                  <Text className="text-white text-xs font-jakarta-bold">
                    {data.unreadCount > 99 ? '99+' : data.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </SquishyPressable>
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
