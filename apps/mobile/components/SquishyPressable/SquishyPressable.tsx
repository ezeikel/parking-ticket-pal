import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
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
  /**
   * Layout styles for the touchable wrapper itself — `flex`, `width`, `marginX`, `alignSelf`, etc.
   *
   * **IMPORTANT — read this before reaching for `<SquishyPressable><View style={{ flex: 1 }}>`:**
   *
   * The bug we keep re-introducing: putting `flex: 1` on the *inner* `<View>` instead of on the
   * SquishyPressable. The inner View can't fill a parent that has no defined size, so the button
   * collapses to its children's intrinsic width and renders as a squashed pill with clipped icons.
   *
   * ✅ Correct: layout on the touchable, visuals inside.
   * ```tsx
   * <SquishyPressable onPress={...} style={{ flex: 1 }}>
   *   <View style={{ padding: 12, backgroundColor: '#1ABC9C', borderRadius: 8 }}>
   *     ...
   *   </View>
   * </SquishyPressable>
   * ```
   *
   * ❌ Wrong: flex on the inner View does nothing because the outer Pressable has no width.
   * ```tsx
   * <SquishyPressable onPress={...}>
   *   <View style={{ flex: 1, padding: 12, ... }}>  // collapses
   *     ...
   *   </View>
   * </SquishyPressable>
   * ```
   *
   * Prior fixes for this same bug: 5d7dc4f (Scanner buttons), 6562bc0 (scan preview),
   * a561c4a (PostCapturePreview). If you find yourself fixing it a fourth time, escalate to
   * a defensive refactor of SquishyPressable rather than fixing the call site again.
   */
  style?: StyleProp<ViewStyle>;
};

const SquishyPressable = ({
  onPress,
  disabled,
  children,
  scaleTo = 0.95,
  style,
  ...props
}: SquishyPressableProps) => {
  const pressed = useSharedValue(false);
  const progress = useDerivedValue(() => {
    return pressed.get()
      ? withTiming(1, { duration: 50 })
      : withTiming(0, { duration: 50 });
  });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      progress.get(),
      [0, 1],
      [1, scaleTo],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      <OptionalPressable
        onPress={onPress}
        onPressOut={() => pressed.set(false)}
        onPressIn={() => {
          pressed.set(true);
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
