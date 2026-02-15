import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell } from '@fortawesome/pro-regular-svg-icons';
import { router } from 'expo-router';
import { useNotifications } from '@/hooks/api/useNotifications';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

const AnimatedSquishyPressable = Animated.createAnimatedComponent(SquishyPressable);

const NotificationBell = () => {
  const { data } = useNotifications();
  const unreadCount = data?.unreadCount || 0;
  const scale = useSharedValue(1);
  const badgeScale = useSharedValue(1);

  // Animate badge when unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      badgeScale.value = withSpring(1.2, { damping: 8 }, () => {
        badgeScale.value = withSpring(1);
      });
    }
  }, [unreadCount]);

  const handlePress = () => {
    scale.value = withSpring(0.9, { damping: 8 }, () => {
      scale.value = withSpring(1);
    });
    router.push('/(authenticated)/notifications');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <AnimatedSquishyPressable
      onPress={handlePress}
      className="relative p-3 mr-2"
      style={animatedStyle}
    >
      <FontAwesomeIcon
        icon={faBell}
        size={24}
        color="#6B7280"
      />

      {unreadCount > 0 && (
        <Animated.View
          className="absolute top-1 right-0 bg-[#1ABC9C] rounded-full min-w-[20px] h-5 items-center justify-center px-1.5"
          style={badgeAnimatedStyle}
        >
          <Text className="text-white text-xs font-jakarta-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </Animated.View>
      )}
    </AnimatedSquishyPressable>
  );
};

export default NotificationBell;
