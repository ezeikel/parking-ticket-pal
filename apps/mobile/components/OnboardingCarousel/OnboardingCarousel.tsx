import { View, Text, Dimensions, Image } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useState } from 'react';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { useAnalytics } from '@/lib/analytics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  illustration: any;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    illustration: require('@/assets/illustrations/1-upload-ticket.png'),
    title: 'Snap & Upload',
    description: 'Take a photo of your parking ticket in seconds. Quick, simple, and secure.',
  },
  {
    id: '2',
    illustration: require('@/assets/illustrations/2-ai-helper.png'),
    title: 'AI-Powered Appeals',
    description: 'Our intelligent AI analyses your ticket and crafts a compelling appeal letter tailored to your case.',
  },
  {
    id: '3',
    illustration: require('@/assets/illustrations/3-success.png'),
    title: 'Track & Win',
    description: 'Monitor your appeal status and get notified when you successfully challenge your fine.',
  },
];

interface PaginationDotProps {
  index: number;
  activeIndex: Animated.SharedValue<number>;
}

const PaginationDot = ({ index, activeIndex }: PaginationDotProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];

    const width = interpolate(
      activeIndex.value,
      inputRange,
      [8, 24, 8],
      'clamp'
    );

    const opacity = interpolate(
      activeIndex.value,
      inputRange,
      [0.5, 1, 0.5],
      'clamp'
    );

    // Interpolate between gray and teal
    const backgroundColor = interpolate(
      activeIndex.value,
      inputRange,
      [0, 1, 0],
      'clamp'
    );

    // Convert interpolated value to color
    const tealR = 26;
    const tealG = 188;
    const tealB = 156;
    const grayR = 209;
    const grayG = 213;
    const grayB = 219;

    const r = Math.round(grayR + (tealR - grayR) * backgroundColor);
    const g = Math.round(grayG + (tealG - grayG) * backgroundColor);
    const b = Math.round(grayB + (tealB - grayB) * backgroundColor);

    return {
      width,
      opacity,
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          marginHorizontal: 4,
        },
        animatedStyle,
      ]}
    />
  );
};

interface OnboardingCarouselProps {
  onComplete: () => void;
}

const OnboardingCarousel = ({ onComplete }: OnboardingCarouselProps) => {
  const activeIndex = useSharedValue(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useState<any>(null);
  const { trackEvent } = useAnalytics();

  const updateCurrentSlide = (progress: number) => {
    const newSlide = Math.round(progress);
    if (newSlide !== currentSlide) {
      setCurrentSlide(newSlide);
    }
  };

  const renderItem = ({ item }: { item: OnboardingSlide }) => (
    <View className="flex-1 items-center justify-center px-8">
      {/* Illustration */}
      <View className="w-full aspect-square max-w-sm mb-12 rounded-3xl overflow-hidden">
        <Image
          source={item.illustration}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>

      {/* Content */}
      <View className="items-center">
        <Text className="font-inter text-3xl font-bold text-gray-900 text-center mb-4">
          {item.title}
        </Text>
        <Text className="font-inter text-lg text-gray-600 text-center leading-relaxed max-w-md">
          {item.description}
        </Text>
      </View>
    </View>
  );

  const handleNext = () => {
    const nextSlide = currentSlide + 1;
    trackEvent('onboarding_next_clicked', {
      screen: 'onboarding',
      current_slide: currentSlide,
      slide_title: slides[currentSlide].title,
    });

    if (carouselRef[0]) {
      carouselRef[0].next();
    }
  };

  const handleGetStarted = () => {
    trackEvent('onboarding_get_started_clicked', {
      screen: 'onboarding',
      slides_viewed: currentSlide + 1,
    });
    onComplete();
  };

  const handleSkip = () => {
    trackEvent('onboarding_skipped', {
      screen: 'onboarding',
      skipped_at_slide: currentSlide,
      slide_title: slides[currentSlide].title,
    });
    onComplete();
  };

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <View className="flex-1 bg-white">
      {/* Skip Button */}
      <View className="absolute top-14 right-6 z-10">
        <SquishyPressable onPress={handleSkip}>
          <Text className="font-inter text-base font-semibold text-gray-500">
            Skip
          </Text>
        </SquishyPressable>
      </View>

      {/* Carousel */}
      <View className="flex-1 justify-center">
        <Carousel
          ref={(ref) => {
            carouselRef[0] = ref;
          }}
          width={screenWidth}
          height={screenHeight * 0.75}
          data={slides}
          renderItem={renderItem}
          onProgressChange={(_, absoluteProgress) => {
            activeIndex.value = absoluteProgress;
            updateCurrentSlide(absoluteProgress);
          }}
          pagingEnabled
          snapEnabled
          loop={false}
        />
      </View>

      {/* Pagination & Action Button */}
      <View className="pb-12 px-8">
        {/* Pagination Dots */}
        <View className="flex-row justify-center items-center mb-8">
          {slides.map((_, index) => (
            <PaginationDot key={index} index={index} activeIndex={activeIndex} />
          ))}
        </View>

        {/* Next / Get Started Button */}
        <SquishyPressable
          onPress={isLastSlide ? handleGetStarted : handleNext}
          className="py-4 rounded-xl items-center justify-center"
          style={{
            backgroundColor: '#1ABC9C',
          }}
        >
          <Text className="font-inter font-semibold text-white text-lg">
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </SquishyPressable>
      </View>
    </View>
  );
};

export default OnboardingCarousel;
