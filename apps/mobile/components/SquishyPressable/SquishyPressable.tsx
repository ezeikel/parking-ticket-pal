import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import OptionalPressable from '@/components/OptionalPressable/OptionalPressable';

type SquishyPressableProps = PressableProps & {
  children: ReactNode;
  onPress?: () => void;
  scaleTo?: number;
  disabled?: boolean;
};

const SquishyPressable = ({
  onPress,
  disabled,
  children,
  scaleTo = 0.95,
  ...props
}: SquishyPressableProps) => {
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
      [1, scaleTo],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[animatedStyle]}>
      <OptionalPressable
        onPress={onPress}
        onPressOut={() => (pressed.value = false)}
        onPressIn={() => {
          pressed.value = true;
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        disabled={disabled}
        {...props}
      >
        {children}
      </OptionalPressable>
    </Animated.View>
  );
};

export default SquishyPressable;
