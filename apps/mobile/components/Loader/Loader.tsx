import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSpinnerThird } from "@fortawesome/pro-solid-svg-icons";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type LoaderProps = {
  size?: number;
  color?: string;
};

const Loader = ({ size = 32, color }: LoaderProps) => {
  const colorScheme = useColorScheme();
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      -1,
      false
    );
  }, []);

  return (
    <View className="items-center justify-center">
      <Animated.View style={animatedStyle}>
        <FontAwesomeIcon
          icon={faSpinnerThird}
          size={size}
          color={color || Colors[colorScheme ?? 'light'].text}
        />
      </Animated.View>
    </View>
  );
};

export default Loader;