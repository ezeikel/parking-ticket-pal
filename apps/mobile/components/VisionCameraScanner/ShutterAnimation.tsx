import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

type ShutterAnimationProps = {
  visible: boolean;
  onAnimationComplete?: () => void;
};

/**
 * Shutter animation component that shows a white flash when taking a photo
 * Provides visual feedback that a capture has occurred
 */
const ShutterAnimation: React.FC<ShutterAnimationProps> = ({
  visible,
  onAnimationComplete,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Start shutter animation
      opacity.value = withSequence(
        // Flash in
        withTiming(1, {
          duration: 100,
          easing: Easing.out(Easing.ease),
        }),
        // Hold briefly
        withTiming(1, {
          duration: 50,
        }),
        // Fade out
        withTiming(0, {
          duration: 150,
          easing: Easing.in(Easing.ease),
        }, (finished) => {
          if (finished && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        })
      );

      // Subtle scale effect for extra polish
      scale.value = withSequence(
        withTiming(1.02, {
          duration: 100,
          easing: Easing.out(Easing.ease),
        }),
        withTiming(1, {
          duration: 200,
          easing: Easing.in(Easing.ease),
        })
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents="none"
    >
      <View style={styles.flash} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'white',
  },
});

export default ShutterAnimation;