import { useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

const TESTIMONIALS = [
  {
    initials: 'PS',
    color: '#6366F1',
    quote: 'Deadline reminders saved me — had no idea fines double after 14 days!',
    name: 'Priya S.',
    saved: '£110',
  },
  {
    initials: 'SM',
    color: '#EC4899',
    quote: 'Used the appeal letter tool after checking my score. Ticket cancelled in 3 days.',
    name: 'Sarah M.',
    saved: '£130',
  },
  {
    initials: 'JK',
    color: '#14B8A6',
    quote: 'All my tickets tracked in one place with deadline alerts. Lifesaver.',
    name: 'James K.',
    saved: '£65',
  },
];

const ROTATION_INTERVAL = 4000;
const FADE_DURATION = 250;

export function PaywallSocialProof() {
  const currentIndex = useSharedValue(0);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const advanceIndex = useCallback(() => {
    currentIndex.value = (currentIndex.value + 1) % TESTIMONIALS.length;
  }, [currentIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out + slide up
      opacity.value = withTiming(0, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(-6, {
        duration: FADE_DURATION,
        easing: Easing.out(Easing.ease),
      });

      // After fade out, swap content and fade back in
      opacity.value = withDelay(
        FADE_DURATION,
        withTiming(1, {
          duration: FADE_DURATION,
          easing: Easing.in(Easing.ease),
        }),
      );
      translateY.value = withSequence(
        withTiming(-6, { duration: FADE_DURATION }),
        withTiming(6, { duration: 0 }),
        withTiming(0, {
          duration: FADE_DURATION,
          easing: Easing.out(Easing.ease),
        }),
      );

      // Update index at the midpoint
      setTimeout(() => {
        runOnJS(advanceIndex)();
      }, FADE_DURATION);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [opacity, translateY, advanceIndex]);

  return (
    <View className="px-6 pb-3">
      {/* Stats strip */}
      <View className="flex-row items-center justify-center mb-2.5">
        <Text className="font-jakarta-medium text-xs text-gray">
          30,000+ cases analysed
        </Text>
        <Text className="text-gray mx-1.5">·</Text>
        <Text className="font-jakarta-medium text-xs text-gray">
          46% win rate
        </Text>
      </View>

      {/* Testimonial cards — one per testimonial, stacked absolutely */}
      <View style={{ height: 52 }}>
        {TESTIMONIALS.map((t, i) => (
          <TestimonialRow
            key={t.name}
            testimonial={t}
            index={i}
            currentIndex={currentIndex}
            opacity={opacity}
            translateY={translateY}
          />
        ))}
      </View>
    </View>
  );
}

function TestimonialRow({
  testimonial,
  index,
  currentIndex,
  opacity,
  translateY,
}: {
  testimonial: (typeof TESTIMONIALS)[number];
  index: number;
  currentIndex: SharedValue<number>;
  opacity: SharedValue<number>;
  translateY: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const isActive = currentIndex.value === index;
    return {
      opacity: isActive ? opacity.value : 0,
      transform: [{ translateY: isActive ? translateY.value : 0 }],
      zIndex: isActive ? 1 : 0,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: index === 0 ? 'relative' : 'absolute',
          top: 0,
          left: 0,
          right: 0,
        },
        animatedStyle,
      ]}
    >
      <View className="flex-row items-center bg-light rounded-xl px-3 py-2.5">
        {/* Avatar bubble */}
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-2.5"
          style={{ backgroundColor: testimonial.color }}
        >
          <Text className="font-jakarta-bold text-xs text-white">
            {testimonial.initials}
          </Text>
        </View>

        {/* Quote + attribution */}
        <View className="flex-1">
          <Text
            className="font-jakarta text-xs text-dark leading-4"
            numberOfLines={2}
          >
            &ldquo;{testimonial.quote}&rdquo;
          </Text>
          <Text className="font-jakarta-medium text-xs text-gray mt-0.5">
            {testimonial.name} · Saved {testimonial.saved}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
