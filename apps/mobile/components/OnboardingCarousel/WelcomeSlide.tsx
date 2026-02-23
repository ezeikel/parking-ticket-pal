import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faParking, faGavel, faShieldCheck } from '@fortawesome/pro-solid-svg-icons';

const FloatingIcon = ({
  icon,
  color,
  delay,
  left,
  top,
  isActive,
}: {
  icon: any;
  color: string;
  delay: number;
  left: number;
  top: number;
  isActive: boolean;
}) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!isActive) return;
    translateY.set(withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1500 }),
          withTiming(8, { duration: 1500 }),
        ),
        -1,
        true,
      ),
    ));
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(800)}
      style={[
        {
          position: 'absolute',
          left,
          top,
          backgroundColor: color,
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 12,
          opacity: 0.15,
        },
        animatedStyle,
      ]}
    >
      <FontAwesomeIcon icon={icon} size={24} color="#000" />
    </Animated.View>
  );
};

type WelcomeSlideProps = {
  isActive: boolean;
};

const WelcomeSlide = ({ isActive }: WelcomeSlideProps) => {
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  if (!hasBeenActive) {
    return <View className="flex-1" />;
  }

  return (
    <View className="flex-1 items-center justify-center px-8">
      {/* Floating decorative icons */}
      <FloatingIcon icon={faParking} color="#E0F2FE" delay={0} left={40} top={80} isActive={hasBeenActive} />
      <FloatingIcon icon={faGavel} color="#FEF3C7" delay={300} left={280} top={120} isActive={hasBeenActive} />
      <FloatingIcon icon={faShieldCheck} color="#D1FAE5" delay={600} left={60} top={340} isActive={hasBeenActive} />

      {/* App icon */}
      <Animated.View entering={ZoomIn.duration(600).springify()}>
        <Image
          source={require('@/assets/logos/ptp.png')}
          style={{ width: 120, height: 120, marginBottom: 32 }}
          contentFit="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View entering={FadeIn.delay(300).duration(600)}>
        <Text className="font-jakarta-bold text-3xl text-gray-900 text-center mb-4">
          Take control of your parking tickets
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(500).duration(600)}>
        <Text className="font-jakarta text-lg text-gray-500 text-center leading-relaxed max-w-xs">
          Track deadlines, avoid increased fines, and challenge when it makes sense
        </Text>
      </Animated.View>
    </View>
  );
};

export default WelcomeSlide;
