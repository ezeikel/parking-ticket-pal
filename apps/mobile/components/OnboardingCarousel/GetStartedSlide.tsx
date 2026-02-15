import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRocket, faCheck } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type GetStartedSlideProps = {
  onGetStarted: () => void;
};

const BenefitRow = ({ text, delay }: { text: string; delay: number }) => (
  <Animated.View
    entering={FadeInUp.delay(delay).duration(400)}
    className="flex-row items-center mb-3"
  >
    <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center mr-3">
      <FontAwesomeIcon icon={faCheck} size={12} color="#10B981" />
    </View>
    <Text className="font-jakarta text-base text-gray-700 flex-1">{text}</Text>
  </Animated.View>
);

const GetStartedSlide = ({ onGetStarted }: GetStartedSlideProps) => {
  return (
    <View className="flex-1 justify-center px-8">
      {/* Icon */}
      <Animated.View entering={ZoomIn.duration(500).springify()} className="items-center mb-8">
        <View
          className="w-24 h-24 rounded-3xl items-center justify-center"
          style={{ backgroundColor: '#1ABC9C' }}
        >
          <FontAwesomeIcon icon={faRocket} size={40} color="#fff" />
        </View>
      </Animated.View>

      {/* Header */}
      <Animated.View entering={FadeIn.delay(200).duration(500)} className="items-center mb-8">
        <Text className="font-jakarta-bold text-3xl text-gray-900 text-center mb-3">
          You're all set!
        </Text>
        <Text className="font-jakarta text-base text-gray-500 text-center leading-6">
          Start fighting unfair parking tickets today
        </Text>
      </Animated.View>

      {/* Benefits */}
      <View className="mb-10">
        <BenefitRow text="Upload tickets in seconds" delay={400} />
        <BenefitRow text="AI-crafted appeal letters" delay={500} />
        <BenefitRow text="Track your case progress" delay={600} />
        <BenefitRow text="No account required to get started" delay={700} />
      </View>

      {/* CTA */}
      <Animated.View entering={FadeInUp.delay(800).duration(500)}>
        <SquishyPressable
          onPress={onGetStarted}
          className="py-4 rounded-xl items-center justify-center"
          style={{ backgroundColor: '#1ABC9C' }}
        >
          <Text className="font-jakarta-semibold text-white text-lg">
            Get Started
          </Text>
        </SquishyPressable>
      </Animated.View>
    </View>
  );
};

export default GetStartedSlide;
