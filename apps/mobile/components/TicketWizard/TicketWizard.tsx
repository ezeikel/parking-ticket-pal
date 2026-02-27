import { useState, useCallback, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics';
import type { OCRProcessingResult } from '@/hooks/api/useOCR';
import WizardStepLayout from './WizardStepLayout';
import IssuerStep from './steps/IssuerStep';
import StageStep from './steps/StageStep';
import DetailsStep from './steps/DetailsStep';
import ConfirmStep from './steps/ConfirmStep';
import IntentStep from './steps/IntentStep';
import ReasonStep from './steps/ReasonStep';
import CreatingStep from './steps/CreatingStep';
import {
  type WizardStep,
  type WizardData,
  type WizardResult,
  buildWizardDataFromOCR,
  emptyWizardData,
} from './types';

type TicketWizardProps = {
  ocrData?: OCRProcessingResult | null;
  onComplete: (result: WizardResult) => void;
  onCancel: () => void;
};

const STEP_ORDER: WizardStep[] = [
  'issuer',
  'stage',
  'details',
  'confirm',
  'intent',
  'reason',
  'creating',
];

function getStepTitle(step: WizardStep): string {
  switch (step) {
    case 'issuer':
      return 'Who issued your ticket?';
    case 'stage':
      return 'What stage are you at?';
    case 'details':
      return 'Enter your ticket details';
    case 'confirm':
      return 'Confirm your details';
    case 'intent':
      return 'What would you like to do?';
    case 'reason':
      return 'Why do you want to challenge?';
    case 'creating':
      return 'Creating your ticket';
    default:
      return '';
  }
}

const TicketWizard = ({ ocrData, onComplete, onCancel }: TicketWizardProps) => {
  const hasOCR = !!ocrData?.success && !!ocrData?.data;
  const [wizardData, setWizardData] = useState<WizardData>(
    hasOCR ? buildWizardDataFromOCR(ocrData!) : emptyWizardData(),
  );
  const [currentStep, setCurrentStep] = useState<WizardStep>(hasOCR ? 'confirm' : 'issuer');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const { trackEvent } = useAnalytics();
  const lastTrackedStep = useRef<WizardStep | null>(null);

  const getStepFlow = useCallback((): WizardStep[] => {
    if (hasOCR) {
      if (wizardData.intent === 'challenge') {
        return ['confirm', 'intent', 'reason', 'creating'];
      }
      return ['confirm', 'intent', 'creating'];
    }
    if (wizardData.intent === 'challenge') {
      return ['issuer', 'stage', 'details', 'intent', 'reason', 'creating'];
    }
    return ['issuer', 'stage', 'details', 'intent', 'creating'];
  }, [hasOCR, wizardData.intent]);

  const getStepNumber = useCallback(() => {
    const flow = getStepFlow();
    const index = flow.indexOf(currentStep);
    return index >= 0 ? index + 1 : 1;
  }, [getStepFlow, currentStep]);

  const getTotalSteps = useCallback(() => {
    return getStepFlow().length;
  }, [getStepFlow]);

  const trackStepView = useCallback(
    (step: WizardStep) => {
      if (step !== lastTrackedStep.current) {
        lastTrackedStep.current = step;
        trackEvent('wizard_step_viewed', {
          screen: 'onboarding',
          step_name: step,
          step_number: getStepFlow().indexOf(step) + 1,
          source: hasOCR ? 'ocr' : 'manual',
        });
      }
    },
    [trackEvent, getStepFlow, hasOCR],
  );

  const goToStep = useCallback(
    (step: WizardStep, dir: 'forward' | 'back' = 'forward') => {
      setDirection(dir);
      setCurrentStep(step);
      trackStepView(step);
    },
    [trackStepView],
  );

  const handleNext = useCallback(
    (updates: Partial<WizardData>) => {
      const newData = { ...wizardData, ...updates };
      setWizardData(newData);

      trackEvent('wizard_step_completed', {
        screen: 'onboarding',
        step_name: currentStep,
        selected_value: Object.entries(updates)
          .map(([k, v]) => `${k}=${v}`)
          .join(','),
      });

      // Determine next step
      switch (currentStep) {
        case 'issuer':
          goToStep('stage');
          break;
        case 'stage':
          goToStep('details');
          break;
        case 'details':
          goToStep('intent');
          break;
        case 'confirm':
          goToStep('intent');
          break;
        case 'intent': {
          const intent = updates.intent ?? newData.intent;
          if (intent === 'challenge') {
            goToStep('reason');
          } else {
            goToStep('creating');
          }
          break;
        }
        case 'reason':
          goToStep('creating');
          break;
        default:
          break;
      }
    },
    [wizardData, currentStep, goToStep, trackEvent],
  );

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'issuer':
        trackEvent('wizard_abandoned', {
          screen: 'onboarding',
          last_step: currentStep,
          source: hasOCR ? 'ocr' : 'manual',
        });
        onCancel();
        break;
      case 'stage':
        goToStep('issuer', 'back');
        break;
      case 'details':
        goToStep('stage', 'back');
        break;
      case 'confirm':
        trackEvent('wizard_abandoned', {
          screen: 'onboarding',
          last_step: currentStep,
          source: hasOCR ? 'ocr' : 'manual',
        });
        onCancel();
        break;
      case 'intent':
        goToStep(hasOCR ? 'confirm' : 'details', 'back');
        break;
      case 'reason':
        goToStep('intent', 'back');
        break;
      case 'creating':
        // Can't go back from creating
        break;
      default:
        onCancel();
        break;
    }
  }, [currentStep, hasOCR, goToStep, onCancel, trackEvent]);

  const handleWizardComplete = useCallback(
    (result: WizardResult) => {
      trackEvent('wizard_completed', {
        screen: 'onboarding',
        intent: result.intent,
        ticket_id: result.ticketId,
        source: hasOCR ? 'ocr' : 'manual',
      });
      onComplete(result);
    },
    [trackEvent, hasOCR, onComplete],
  );

  // CreatingStep has its own layout (full-screen loading)
  if (currentStep === 'creating') {
    return <CreatingStep wizardData={wizardData} onComplete={handleWizardComplete} />;
  }

  const stepProps = {
    wizardData,
    onNext: handleNext,
    onBack: handleBack,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'issuer':
        return <IssuerStep {...stepProps} />;
      case 'stage':
        return <StageStep {...stepProps} />;
      case 'details':
        return <DetailsStep {...stepProps} />;
      case 'confirm':
        return <ConfirmStep {...stepProps} />;
      case 'intent':
        return <IntentStep {...stepProps} />;
      case 'reason':
        return <ReasonStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <WizardStepLayout
      stepNumber={getStepNumber()}
      totalSteps={getTotalSteps()}
      title={getStepTitle(currentStep)}
      onBack={handleBack}
      direction={direction}
    >
      {renderStep()}
    </WizardStepLayout>
  );
};

export default TicketWizard;
