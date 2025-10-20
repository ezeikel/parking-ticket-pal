import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { GestureResponderEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SquishyHapticTab = (props: BottomTabBarButtonProps) => {
  const pressed = useSharedValue(false);
  const progress = useDerivedValue(() => {
    return pressed.value
      ? withTiming(1, { duration: 50 })
      : withTiming(0, { duration: 50 });
  });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      progress.value,
      [0, 1],
      [1, 0.92],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[animatedStyle, { flex: 1 }]}>
      <PlatformPressable
        {...props}
        onPressIn={(ev: GestureResponderEvent) => {
          pressed.value = true;
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}
        onPressOut={(ev: GestureResponderEvent) => {
          pressed.value = false;
          props.onPressOut?.(ev);
        }}
      />
    </Animated.View>
  );
};

export default SquishyHapticTab;
