import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type WizardStepLayoutProps = {
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  direction: 'forward' | 'back';
  children: React.ReactNode;
};

const WizardStepLayout = ({
  stepNumber,
  totalSteps,
  title,
  subtitle,
  onBack,
  direction,
  children,
}: WizardStepLayoutProps) => {
  const insets = useSafeAreaInsets();
  const progress = stepNumber / totalSteps;

  const entering = direction === 'forward' ? SlideInRight.duration(300) : SlideInLeft.duration(300);
  const exiting = direction === 'forward' ? SlideOutLeft.duration(300) : SlideOutRight.duration(300);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <SquishyPressable onPress={onBack} className="flex-row items-center gap-x-2">
          <FontAwesomeIcon icon={faArrowLeft} size={14} color="#6B7280" />
          <Text className="font-jakarta-medium text-sm text-gray-500">Back</Text>
        </SquishyPressable>
        <Text className="font-jakarta-semibold text-xs text-gray-400 uppercase tracking-wider">
          Step {stepNumber} of {totalSteps}
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="mx-6 mt-2 h-1 rounded-full bg-gray-100">
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 9999,
            backgroundColor: '#1ABC9C',
          }}
        />
      </View>

      {/* Content */}
      <Animated.View
        key={`step-${stepNumber}`}
        entering={entering}
        exiting={exiting}
        className="flex-1 px-6 pt-6"
      >
        <Text className="font-jakarta-bold text-2xl text-gray-900 mb-2">{title}</Text>
        {subtitle && (
          <Text className="font-jakarta text-base text-gray-500 mb-6 leading-6">{subtitle}</Text>
        )}
        {children}
      </Animated.View>
    </View>
  );
};

export default WizardStepLayout;
