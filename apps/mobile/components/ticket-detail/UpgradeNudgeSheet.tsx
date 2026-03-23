import React, { useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark, faQuoteLeft } from '@fortawesome/pro-regular-svg-icons';
import { faCircleCheck, faStar } from '@fortawesome/pro-solid-svg-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import ScoreGauge from '@/components/ScoreGauge/ScoreGauge';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

interface UpgradeNudgeSheetProps {
  visible: boolean;
  onUpgrade: () => void;
  onClose: () => void;
  daysUntilDiscount?: number | null;
}

const features = [
  'Success prediction score',
  'AI-drafted challenge letter',
  'Automatic submission',
  '30-day ad-free experience',
];

const UpgradeNudgeSheet = ({
  visible,
  onUpgrade,
  onClose,
  daysUntilDiscount,
}: UpgradeNudgeSheetProps) => {
  const insets = useSafeAreaInsets();

  // Entrance animations
  const gaugeScale = useSharedValue(0.8);
  const gaugeOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  const contentOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(30);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset
      gaugeScale.value = 0.8;
      gaugeOpacity.value = 0;
      contentTranslateY.value = 20;
      contentOpacity.value = 0;
      ctaTranslateY.value = 30;
      ctaOpacity.value = 0;

      // Staggered entrance
      gaugeOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      gaugeScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));

      contentOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
      contentTranslateY.value = withDelay(400, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));

      ctaOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
      ctaTranslateY.value = withDelay(600, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    }
  }, [visible]);

  const gaugeStyle = useAnimatedStyle(() => ({
    opacity: gaugeOpacity.value,
    transform: [{ scale: gaugeScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      presentationStyle="formSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 16 + insets.top,
          paddingBottom: insets.bottom || 16,
          backgroundColor: '#ffffff',
          justifyContent: 'space-between',
        }}
      >
        {/* Top section */}
        <View>
          {/* Close button */}
          <View className="flex-row justify-end mb-2">
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesomeIcon icon={faXmark} size={20} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* Header */}
          <Text className="text-2xl font-jakarta-bold text-dark text-center mb-2">
            Your ticket has been analysed
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            30,000+ cases analysed · 46% average win rate
          </Text>

          {/* Score gauge teaser (animated) */}
          <Animated.View className="items-center mb-6" style={gaugeStyle}>
            <ScoreGauge score={0} size="lg" showLabel locked />
            <Text className="text-xs text-gray-400 mt-2 font-jakarta-medium">
              See your chances
            </Text>
          </Animated.View>

          {/* Deadline urgency */}
          {daysUntilDiscount != null && daysUntilDiscount > 0 && (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
              <Text className="text-sm text-amber-800 text-center font-jakarta-medium">
                Your discount deadline is in {daysUntilDiscount} day
                {daysUntilDiscount !== 1 ? 's' : ''}. Challenge before your fine
                doubles.
              </Text>
            </View>
          )}

          {/* Feature list (animated) */}
          <Animated.View className="gap-2.5 mb-6" style={contentStyle}>
            {features.map((label) => (
              <View key={label} className="flex-row items-center gap-2.5">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  size={16}
                  color="#14b8a6"
                />
                <Text className="text-sm text-gray-700 font-jakarta-medium flex-1">
                  {label}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Testimonial (fills empty space) */}
          <Animated.View
            className="bg-gray-50 rounded-xl p-4 mb-4"
            style={contentStyle}
          >
            <FontAwesomeIcon
              icon={faQuoteLeft}
              size={14}
              color="#D1D5DB"
              style={{ marginBottom: 8 }}
            />
            <Text className="text-sm text-gray-600 font-jakarta-regular leading-5 mb-3">
              &quot;Deadline reminders saved me — had no idea fines double after
              14 days!&quot;
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 bg-teal/20 rounded-full items-center justify-center">
                <Text className="text-xs font-jakarta-semibold text-teal">
                  PS
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-jakarta-semibold text-gray-700">
                  Priya S.
                </Text>
                <Text className="text-xs text-gray-400">Saved £110</Text>
              </View>
              <View className="flex-row gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStar}
                    size={10}
                    color="#FBBF24"
                  />
                ))}
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Bottom section (animated) */}
        <Animated.View style={ctaStyle}>
          {/* CTA */}
          <SquishyPressable
            onPress={onUpgrade}
            className="rounded-xl py-3.5 bg-dark mb-3"
          >
            <Text className="font-jakarta-semibold text-white text-center text-base">
              Upgrade — £14.99
            </Text>
          </SquishyPressable>

          {/* Dismiss */}
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-sm text-gray-400 text-center font-jakarta-medium py-2">
              Not now
            </Text>
          </Pressable>

          {/* Fine print */}
          <Text className="text-xs text-gray-300 text-center mt-1 mb-2">
            One-time purchase per ticket. No subscriptions.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

UpgradeNudgeSheet.displayName = 'UpgradeNudgeSheet';

export default UpgradeNudgeSheet;
