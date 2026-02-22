import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
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

type AIAppealsSlideProps = {
  isActive: boolean;
};

const AIAppealsSlide = ({ isActive }: AIAppealsSlideProps) => {
  const [hasBeenActive, setHasBeenActive] = useState(false);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  if (!hasBeenActive) {
    return <View className="flex-1" />;
  }

  return (
    <View className="flex-1 justify-center px-8">
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100).duration(500)} className="mb-8">
        <Text className="font-jakarta-bold text-3xl text-gray-900 mb-3">
          Challenge Tools
        </Text>
        <Text className="font-jakarta text-base text-gray-500 leading-6">
          Think your ticket was unfair? We give you the tools to take action
        </Text>
      </Animated.View>

      {/* Feature points */}
      <View>
        <FeaturePoint
          icon={faBrain}
          color="#6366F1"
          title="Success Score"
          description="See how likely a challenge is to succeed, based on real UK tribunal data"
          delay={200}
        />
        <FeaturePoint
          icon={faWandMagicSparkles}
          color="#1ABC9C"
          title="Appeal Letters"
          description="Generate a tailored appeal letter with optional AI assistance, then review and send"
          delay={400}
        />
        <FeaturePoint
          icon={faFileLines}
          color="#F59E0B"
          title="Official Forms"
          description="Fill in TE7, TE9, PE2, and PE3 forms with step-by-step guidance"
          delay={600}
        />
      </View>
    </View>
  );
};

export default AIAppealsSlide;
