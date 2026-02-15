import { View, Dimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useState, useCallback, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics';
import WelcomeSlide from './WelcomeSlide';
import AIAppealsSlide from './AIAppealsSlide';
import TrackWinSlide from './TrackWinSlide';
import ScanTicketSlide from './ScanTicketSlide';
import GetStartedSlide from './GetStartedSlide';
import CameraSheet from '@/components/CameraSheet/CameraSheet';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SLIDE_COUNT = 5;

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
      'clamp',
    );

    const opacity = interpolate(
      activeIndex.value,
      inputRange,
      [0.5, 1, 0.5],
      'clamp',
    );

    const backgroundColor = interpolate(
      activeIndex.value,
      inputRange,
      [0, 1, 0],
      'clamp',
    );

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
  onTicketCreated?: (ticketId: string) => void;
}

const OnboardingCarousel = ({ onComplete, onTicketCreated }: OnboardingCarouselProps) => {
  const activeIndex = useSharedValue(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<any>(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const { trackEvent } = useAnalytics();

  const updateCurrentSlide = (progress: number) => {
    const newSlide = Math.round(progress);
    if (newSlide !== currentSlide) {
      setCurrentSlide(newSlide);
    }
  };

  const goToSlide = useCallback(
    (index: number) => {
      if (carouselRef.current) {
        // scrollTo expects relative offset from current
        const offset = index - currentSlide;
        if (offset !== 0) {
          for (let i = 0; i < Math.abs(offset); i++) {
            if (offset > 0) {
              carouselRef.current.next();
            } else {
              carouselRef.current.prev();
            }
          }
        }
      }
    },
    [currentSlide],
  );

  const handleScanNow = () => {
    trackEvent('onboarding_scan_now_tapped', { screen: 'onboarding', slide: 3 });
    setIsCameraVisible(true);
  };

  const handleScanSkip = () => {
    trackEvent('onboarding_scan_skipped', { screen: 'onboarding', slide: 3 });
    goToSlide(4);
  };

  const handleCameraClose = () => {
    setIsCameraVisible(false);
    // After camera closes (ticket created or dismissed), go to last slide
    goToSlide(4);
  };

  const handleSkip = () => {
    trackEvent('onboarding_skipped', {
      screen: 'onboarding',
      skipped_at_slide: currentSlide,
    });
    onComplete();
  };

  const renderSlide = ({ index }: { index: number }) => {
    const isActive = currentSlide === index;
    switch (index) {
      case 0:
        return <WelcomeSlide isActive={isActive} />;
      case 1:
        return <AIAppealsSlide isActive={isActive} />;
      case 2:
        return <TrackWinSlide isActive={isActive} />;
      case 3:
        return (
          <ScanTicketSlide isActive={isActive} onScanNow={handleScanNow} onSkip={handleScanSkip} />
        );
      case 4:
        return <GetStartedSlide isActive={isActive} onGetStarted={onComplete} />;
      default:
        return null;
    }
  };

  // Hide pagination on scan and get-started slides (they have their own CTAs)
  const showPagination = currentSlide < 3;
  const showSkip = currentSlide < 3;
  const showNextButton = currentSlide < 3;

  return (
    <View className="flex-1 bg-white">
      {/* Skip Button */}
      {showSkip && (
        <View className="absolute top-14 right-6 z-10">
          <Animated.View>
            <View>
              <Animated.Text
                className="font-jakarta-semibold text-base text-gray-500"
                onPress={handleSkip}
              >
                Skip
              </Animated.Text>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Carousel */}
      <View className="flex-1 justify-center">
        <Carousel
          ref={carouselRef}
          width={screenWidth}
          height={screenHeight * 0.75}
          data={Array.from({ length: SLIDE_COUNT }, (_, i) => i)}
          renderItem={renderSlide}
          onProgressChange={(_, absoluteProgress) => {
            activeIndex.value = absoluteProgress;
            updateCurrentSlide(absoluteProgress);
          }}
          pagingEnabled
          snapEnabled
          loop={false}
        />
      </View>

      {/* Pagination & Next Button */}
      {(showPagination || showNextButton) && (
        <View className="pb-12 px-8">
          {showPagination && (
            <View className="flex-row justify-center items-center mb-8">
              {Array.from({ length: SLIDE_COUNT }, (_, index) => (
                <PaginationDot key={index} index={index} activeIndex={activeIndex} />
              ))}
            </View>
          )}

          {showNextButton && (
            <Animated.View>
              <View
                className="py-4 rounded-xl items-center justify-center"
                style={{ backgroundColor: '#1ABC9C' }}
              >
                <Animated.Text
                  className="font-jakarta-semibold text-white text-lg"
                  onPress={() => {
                    trackEvent('onboarding_next_clicked', {
                      screen: 'onboarding',
                      current_slide: currentSlide,
                    });
                    if (carouselRef.current) {
                      carouselRef.current.next();
                    }
                  }}
                >
                  Next
                </Animated.Text>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      {/* Camera Sheet for ticket scanning */}
      <CameraSheet isVisible={isCameraVisible} onClose={handleCameraClose} />
    </View>
  );
};

export default OnboardingCarousel;
