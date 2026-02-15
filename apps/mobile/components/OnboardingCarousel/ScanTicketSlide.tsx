import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faForward } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type ScanTicketSlideProps = {
  isActive: boolean;
  onScanNow: () => void;
  onSkip: () => void;
};

const ScanTicketSlide = ({ isActive, onScanNow, onSkip }: ScanTicketSlideProps) => {
  const [hasBeenActive, setHasBeenActive] = useState(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  useEffect(() => {
    if (!hasBeenActive) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, [hasBeenActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!hasBeenActive) {
    return <View className="flex-1" />;
  }

  return (
    <View className="flex-1 justify-center px-8">
      {/* Camera icon with pulse */}
      <Animated.View entering={FadeIn.duration(600)} className="items-center mb-10">
        <Animated.View
          style={[
            {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: '#F0FDF4',
              alignItems: 'center',
              justifyContent: 'center',
            },
            pulseStyle,
          ]}
        >
          <View
            className="w-20 h-20 rounded-full items-center justify-center"
            style={{ backgroundColor: '#1ABC9C' }}
          >
            <FontAwesomeIcon icon={faCamera} size={32} color="#fff" />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Text */}
      <Animated.View entering={FadeInUp.delay(200).duration(500)} className="items-center mb-10">
        <Text className="font-jakarta-bold text-3xl text-gray-900 text-center mb-4">
          Got a parking ticket?
        </Text>
        <Text className="font-jakarta text-base text-gray-500 text-center leading-6 max-w-sm">
          Scan it now and we'll start building your appeal right away
        </Text>
      </Animated.View>

      {/* CTAs */}
      <Animated.View entering={FadeInUp.delay(400).duration(500)}>
        <SquishyPressable
          onPress={onScanNow}
          className="py-4 rounded-xl items-center justify-center mb-4 flex-row gap-x-3"
          style={{ backgroundColor: '#1ABC9C' }}
        >
          <FontAwesomeIcon icon={faCamera} size={18} color="#fff" />
          <Text className="font-jakarta-semibold text-white text-lg">
            Yes, scan it now
          </Text>
        </SquishyPressable>

        <SquishyPressable
          onPress={onSkip}
          className="py-4 rounded-xl items-center justify-center flex-row gap-x-2"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <FontAwesomeIcon icon={faForward} size={14} color="#6B7280" />
          <Text className="font-jakarta-medium text-gray-500 text-base">
            Not right now
          </Text>
        </SquishyPressable>
      </Animated.View>
    </View>
  );
};

export default ScanTicketSlide;
