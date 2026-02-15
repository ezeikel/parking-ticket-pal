import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faWandMagicSparkles, faFileLines, faBrain } from '@fortawesome/pro-solid-svg-icons';

const FeaturePoint = ({
  icon,
  color,
  title,
  description,
  delay,
}: {
  icon: any;
  color: string;
  title: string;
  description: string;
  delay: number;
}) => (
  <Animated.View
    entering={FadeInDown.delay(delay).duration(500).springify()}
    className="flex-row items-start mb-5"
  >
    <View
      style={{ backgroundColor: color }}
      className="w-11 h-11 rounded-xl items-center justify-center mr-4"
    >
      <FontAwesomeIcon icon={icon} size={20} color="#fff" />
    </View>
    <View className="flex-1">
      <Text className="font-jakarta-semibold text-base text-gray-900 mb-1">
        {title}
      </Text>
      <Text className="font-jakarta text-sm text-gray-500 leading-5">
        {description}
      </Text>
    </View>
  </Animated.View>
);

const AIAppealsSlide = () => {
  return (
    <View className="flex-1 justify-center px-8">
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100).duration(500)} className="mb-8">
        <Text className="font-jakarta-bold text-3xl text-gray-900 mb-3">
          AI-Powered Appeals
        </Text>
        <Text className="font-jakarta text-base text-gray-500 leading-6">
          Our AI analyses your ticket and builds the strongest possible case
        </Text>
      </Animated.View>

      {/* Feature points */}
      <View>
        <FeaturePoint
          icon={faBrain}
          color="#6366F1"
          title="Smart Analysis"
          description="AI examines your ticket details against thousands of successful appeals"
          delay={200}
        />
        <FeaturePoint
          icon={faWandMagicSparkles}
          color="#1ABC9C"
          title="Auto-Generated Letters"
          description="Get a compelling appeal letter tailored to your specific case"
          delay={400}
        />
        <FeaturePoint
          icon={faFileLines}
          color="#F59E0B"
          title="Legal Grounds"
          description="We identify the strongest legal arguments for your situation"
          delay={600}
        />
      </View>
    </View>
  );
};

export default AIAppealsSlide;
