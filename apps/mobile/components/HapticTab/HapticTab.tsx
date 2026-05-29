import { BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { Pressable, GestureResponderEvent, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const HapticTab = ({
  onPress,
  onPressIn,
  children,
  accessibilityState,
  style,
  testID,
  accessibilityLabel,
}: BottomTabBarButtonProps) => {
  return (
    <Pressable
      onPressIn={(ev: GestureResponderEvent) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
      onPress={onPress}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        { flex: 1, alignItems: 'center', justifyContent: 'center' },
        style as object,
      ]}
    >
      {typeof children === 'function' ? null : children}
    </Pressable>
  );
};

export default HapticTab;
