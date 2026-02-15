import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleCheck, faClock, faPaperPlane, faPartyHorn } from '@fortawesome/pro-solid-svg-icons';

const TimelineStep = ({
  icon,
  color,
  label,
  delay,
  isLast = false,
}: {
  icon: any;
  color: string;
  label: string;
  delay: number;
  isLast?: boolean;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <View className="flex-row items-start mb-0">
      <View className="items-center mr-4">
        <Animated.View
          style={[
            {
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            },
            fillStyle,
          ]}
        >
          <FontAwesomeIcon icon={icon} size={18} color="#fff" />
        </Animated.View>
        {!isLast && (
          <Animated.View
            style={[
              {
                width: 2,
                height: 32,
                backgroundColor: '#E5E7EB',
                marginVertical: 4,
              },
              lineStyle,
            ]}
          />
        )}
      </View>
      <Animated.View
        entering={FadeInRight.delay(delay).duration(400)}
        className="flex-1 pt-2.5"
      >
        <Text className="font-jakarta-medium text-base text-gray-900">
          {label}
        </Text>
      </Animated.View>
    </View>
  );
};

const TrackWinSlide = () => {
  return (
    <View className="flex-1 justify-center px-8">
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100).duration(500)} className="mb-10">
        <Text className="font-jakarta-bold text-3xl text-gray-900 mb-3">
          Track & Win
        </Text>
        <Text className="font-jakarta text-base text-gray-500 leading-6">
          Monitor every step of your appeal journey in real-time
        </Text>
      </Animated.View>

      {/* Timeline */}
      <View>
        <TimelineStep
          icon={faCircleCheck}
          color="#1ABC9C"
          label="Ticket uploaded & analysed"
          delay={200}
        />
        <TimelineStep
          icon={faPaperPlane}
          color="#6366F1"
          label="Appeal letter submitted"
          delay={600}
        />
        <TimelineStep
          icon={faClock}
          color="#F59E0B"
          label="Awaiting council response"
          delay={1000}
        />
        <TimelineStep
          icon={faPartyHorn}
          color="#10B981"
          label="Appeal successful!"
          delay={1400}
          isLast
        />
      </View>
    </View>
  );
};

export default TrackWinSlide;
