import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  duration?: number;
  trackColors?: { on: string; off: string };
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { width: 40, height: 24, padding: 2 },
  medium: { width: 50, height: 30, padding: 2 },
  large: { width: 60, height: 36, padding: 3 },
};

const Switch = ({
  value,
  onValueChange,
  disabled = false,
  duration = 300,
  trackColors = { on: '#3b82f6', off: '#d1d5db' },
  style,
  size = 'medium',
}: SwitchProps) => {
  const sizeConfig = SIZES[size];
  const height = useSharedValue(0);
  const width = useSharedValue(0);
  const animatedValue = useSharedValue(value ? 1 : 0);

  // Sync animated value with prop value
  useEffect(() => {
    animatedValue.set(withTiming(value ? 1 : 0, { duration }));
  }, [value, duration]);

  const trackAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      animatedValue.get(),
      [0, 1],
      [trackColors.off, trackColors.on]
    );

    return {
      backgroundColor: color,
      borderRadius: height.get() / 2,
      opacity: disabled ? 0.5 : 1,
    };
  });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const moveValue = interpolate(
      animatedValue.get(),
      [0, 1],
      [0, width.get() - height.get()]
    );

    return {
      transform: [{ translateX: moveValue }],
      borderRadius: height.get() / 2,
    };
  });

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <SquishyPressable
      onPress={handlePress}
      disabled={disabled}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        onLayout={(e) => {
          height.set(e.nativeEvent.layout.height);
          width.set(e.nativeEvent.layout.width);
        }}
        style={[
          styles.track,
          {
            width: sizeConfig.width,
            height: sizeConfig.height,
            padding: sizeConfig.padding,
          },
          style,
          trackAnimatedStyle,
        ]}
      >
        <Animated.View style={[styles.thumb, thumbAnimatedStyle]} />
      </Animated.View>
    </SquishyPressable>
  );
};

const styles = StyleSheet.create({
  track: {
    alignItems: 'flex-start',
  },
  thumb: {
    height: '100%',
    aspectRatio: 1,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default Switch;
