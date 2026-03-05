import { useState, useCallback } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark, faArrowLeft } from '@fortawesome/pro-regular-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { toast } from '@/lib/toast';
import { generateChallengeLetter } from '@/api';
import { logger } from '@/lib/logger';
import ReasonStep from './steps/ReasonStep';
import DetailsStep from './steps/DetailsStep';
import ReviewStep from './steps/ReviewStep';
import type {
  ChallengeWizardStep,
  ChallengeWizardData,
  ChallengeWizardProps,
} from './types';
import { emptyChallengeWizardData } from './types';

const STEP_TITLES: Record<ChallengeWizardStep, string> = {
  reason: 'Choose your ground',
  details: 'Strengthen your case',
  review: 'Review & generate',
};

const STEP_ORDER: ChallengeWizardStep[] = ['reason', 'details', 'review'];

const ChallengeWizard = ({
  visible,
  pcnNumber,
  ticketId,
  issuerType,
  prediction,
  onSuccess,
  onClose,
}: ChallengeWizardProps) => {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<ChallengeWizardStep>('reason');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [wizardData, setWizardData] = useState<ChallengeWizardData>(emptyChallengeWizardData());
  const [isLoading, setIsLoading] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const progress = (stepIndex + 1) / STEP_ORDER.length;

  const resetAndClose = useCallback(() => {
    setCurrentStep('reason');
    setWizardData(emptyChallengeWizardData());
    setDirection('forward');
    onClose();
  }, [onClose]);

  const goToStep = useCallback((step: ChallengeWizardStep, dir: 'forward' | 'back') => {
    setDirection(dir);
    setCurrentStep(step);
  }, []);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'reason':
        resetAndClose();
        break;
      case 'details':
        goToStep('reason', 'back');
        break;
      case 'review':
        goToStep('details', 'back');
        break;
    }
  }, [currentStep, resetAndClose, goToStep]);

  const handleReasonSelect = useCallback(
    (updates: Pick<ChallengeWizardData, 'selectedReason' | 'selectedReasonLabel'>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
      goToStep('details', 'forward');
    },
    [goToStep],
  );

  const handleDetailsNext = useCallback(
    (updates: Pick<ChallengeWizardData, 'additionalDetails'>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
      goToStep('review', 'forward');
    },
    [goToStep],
  );

  const handleChangeDetails = useCallback((text: string) => {
    setWizardData((prev) => ({ ...prev, additionalDetails: text }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    try {
      logger.debug('Generating challenge letter', {
        action: 'challenge-letter',
        screen: 'challenge-wizard',
        pcnNumber,
        selectedReason: wizardData.selectedReason,
      });
      const result = await generateChallengeLetter(
        pcnNumber,
        wizardData.selectedReason,
        wizardData.additionalDetails || undefined,
      );

      if (result && result.success) {
        toast.success('Letter Generated', 'Check your email');
        setWizardData(emptyChallengeWizardData());
        setCurrentStep('reason');
        onSuccess();
      } else {
        logger.error('Challenge letter generation failed', {
          action: 'challenge-letter',
          screen: 'challenge-wizard',
          result,
        });
        toast.error('Generation Failed', result?.message || 'Please try again');
      }
    } catch (error: any) {
      logger.error(
        'Error generating challenge letter',
        {
          action: 'challenge-letter',
          screen: 'challenge-wizard',
          responseData: error.response?.data,
          responseStatus: error.response?.status,
        },
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error(
        'Generation Failed',
        error.response?.data?.error || error.response?.data?.message || 'Please try again',
      );
    } finally {
      setIsLoading(false);
    }
  }, [pcnNumber, wizardData, onSuccess]);

  const entering = direction === 'forward' ? SlideInRight.duration(300) : SlideInLeft.duration(300);
  const exiting = direction === 'forward' ? SlideOutLeft.duration(300) : SlideOutRight.duration(300);

  const renderStep = () => {
    switch (currentStep) {
      case 'reason':
        return (
          <ReasonStep
            issuerType={issuerType}
            prediction={prediction}
            onSelect={handleReasonSelect}
          />
        );
      case 'details':
        return (
          <DetailsStep
            wizardData={wizardData}
            prediction={prediction}
            onNext={handleDetailsNext}
            onChangeDetails={handleChangeDetails}
          />
        );
      case 'review':
        return (
          <ReviewStep
            wizardData={wizardData}
            prediction={prediction}
            isLoading={isLoading}
            onGenerate={handleGenerate}
          />
        );
    }
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="formSheet"
      animationType="slide"
      onRequestClose={isLoading ? undefined : resetAndClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          {currentStep === 'reason' ? (
            <Pressable onPress={resetAndClose} hitSlop={8} disabled={isLoading}>
              <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
            </Pressable>
          ) : (
            <SquishyPressable
              onPress={handleBack}
              className="flex-row items-center gap-x-2"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faArrowLeft} size={14} color="#6B7280" />
              <Text className="font-jakarta-medium text-sm text-gray-500">Back</Text>
            </SquishyPressable>
          )}
          <Text className="font-jakarta-semibold text-xs text-gray-400 uppercase tracking-wider">
            Step {stepIndex + 1} of {STEP_ORDER.length}
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
              borderCurve: 'continuous',
              backgroundColor: '#1ABC9C',
            }}
          />
        </View>

        {/* Content */}
        <Animated.View
          key={`challenge-step-${currentStep}`}
          entering={entering}
          exiting={exiting}
          className="flex-1 px-6 pt-6"
        >
          <Text className="font-jakarta-bold text-2xl text-gray-900 mb-2">
            {STEP_TITLES[currentStep]}
          </Text>
          {renderStep()}
        </Animated.View>
      </View>
    </Modal>
  );
};

ChallengeWizard.displayName = 'ChallengeWizard';

export default ChallengeWizard;
