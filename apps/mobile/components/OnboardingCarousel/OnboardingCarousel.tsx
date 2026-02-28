import { View, Text, useWindowDimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { useState, useCallback, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics';
import { MAX_CONTENT_WIDTH } from '@/constants/layout';
import type { OCRProcessingResult } from '@/hooks/api/useOCR';
import type { WizardResult } from '@/components/TicketWizard/types';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import WelcomeSlide from './WelcomeSlide';
import AIAppealsSlide from './AIAppealsSlide';
import TrackWinSlide from './TrackWinSlide';
import ScanTicketSlide from './ScanTicketSlide';
import CameraSheet from '@/components/CameraSheet/CameraSheet';
import TicketWizard from '@/components/TicketWizard/TicketWizard';
import { Paywall } from '@/components/Paywall/Paywall';

const SLIDE_COUNT = 4;

type OnboardingPhase = 'carousel' | 'wizard' | 'paywall';

interface PaginationDotProps {
  index: number;
  activeIndex: SharedValue<number>;
}

const PaginationDot = ({ index, activeIndex }: PaginationDotProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];

    // Animate scaleX instead of width to avoid layout recalculation every frame
    const scaleX = interpolate(
      activeIndex.get(),
      inputRange,
      [8 / 24, 1, 8 / 24],
      'clamp',
    );

    const opacity = interpolate(
      activeIndex.get(),
      inputRange,
      [0.5, 1, 0.5],
      'clamp',
    );

    const backgroundColor = interpolate(
      activeIndex.get(),
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
      transform: [{ scaleX }],
      opacity,
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: 24,
          height: 8,
          borderRadius: 4,
          borderCurve: 'continuous',
          marginHorizontal: 4,
          transformOrigin: 'center',
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const activeIndex = useSharedValue(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<any>(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const { trackEvent } = useAnalytics();

  // Phase state machine
  const [phase, setPhase] = useState<OnboardingPhase>('carousel');
  const [ocrData, setOcrData] = useState<OCRProcessingResult | null>(null);
  const [wizardResult, setWizardResult] = useState<WizardResult | null>(null);

  const updateCurrentSlide = (progress: number) => {
    const newSlide = Math.round(progress);
    if (newSlide !== currentSlide) {
      setCurrentSlide(newSlide);
    }
  };

  const handleScanNow = () => {
    trackEvent('onboarding_scan_now_tapped', { screen: 'onboarding', slide: 3 });
    setIsCameraVisible(true);
  };

  const handleManualEntry = () => {
    trackEvent('onboarding_manual_entry_tapped', { screen: 'onboarding', slide: 3 });
    setIsCameraVisible(false);
    setOcrData(null);
    setPhase('wizard');
  };

  const handleScanSkip = () => {
    trackEvent('onboarding_scan_skipped', { screen: 'onboarding', slide: 3 });
    setPhase('paywall');
  };

  const handleOCRComplete = useCallback((result: OCRProcessingResult) => {
    setIsCameraVisible(false);
    setOcrData(result);
    setPhase('wizard');
  }, []);

  const handleCameraClose = () => {
    setIsCameraVisible(false);
  };

  const handleSkip = () => {
    trackEvent('onboarding_skipped', {
      screen: 'onboarding',
      skipped_at_slide: currentSlide,
    });
    setPhase('paywall');
  };

  const handleWizardComplete = useCallback((result: WizardResult) => {
    setWizardResult(result);
    onTicketCreated?.(result.ticketId);
    setPhase('paywall');
  }, [onTicketCreated]);

  const handleWizardCancel = useCallback(() => {
    setOcrData(null);
    setPhase('carousel');
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

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
          <ScanTicketSlide
            isActive={isActive}
            onScanNow={handleScanNow}
            onManualEntry={handleManualEntry}
            onSkip={handleScanSkip}
          />
        );
      default:
        return <View />;
    }
  };

  // Hide pagination on scan slide (it has its own CTAs)
  const showPagination = currentSlide < 3;
  const showSkip = currentSlide < 3;
  const showNextButton = currentSlide < 3;

  if (phase === 'wizard') {
    return (
      <TicketWizard
        ocrData={ocrData}
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    );
  }

  if (phase === 'paywall') {
    return (
      <Paywall
        ticketId={wizardResult?.ticketId}
        source="onboarding"
        onClose={handleOnboardingComplete}
        onPurchaseComplete={handleOnboardingComplete}
      />
    );
  }

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
      <View className="flex-1 justify-center" style={{ maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' }}>
        <Carousel
          ref={carouselRef}
          width={Math.min(screenWidth, MAX_CONTENT_WIDTH)}
          height={screenHeight * 0.75}
          data={Array.from({ length: SLIDE_COUNT }, (_, i) => i)}
          renderItem={renderSlide}
          onProgressChange={(_, absoluteProgress) => {
            activeIndex.set(absoluteProgress);
            updateCurrentSlide(absoluteProgress);
          }}
          pagingEnabled
          snapEnabled
          loop={false}
        />
      </View>

      {/* Pagination & Next Button */}
      {(showPagination || showNextButton) && (
        <View className="pb-12 px-8" style={{ maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' }}>
          {showPagination && (
            <View className="flex-row justify-center items-center mb-8">
              {Array.from({ length: SLIDE_COUNT }, (_, index) => (
                <PaginationDot key={index} index={index} activeIndex={activeIndex} />
              ))}
            </View>
          )}

          {showNextButton && (
            <SquishyPressable
              className="py-4 rounded-xl items-center justify-center"
              style={{ backgroundColor: '#1ABC9C' }}
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
              <Text className="font-jakarta-semibold text-white text-lg">
                Next
              </Text>
            </SquishyPressable>
          )}
        </View>
      )}

      {/* Camera Sheet for ticket scanning */}
      <CameraSheet
        isVisible={isCameraVisible}
        onClose={handleCameraClose}
        onboardingMode
        onOCRComplete={handleOCRComplete}
      />
    </View>
  );
};

export default OnboardingCarousel;
