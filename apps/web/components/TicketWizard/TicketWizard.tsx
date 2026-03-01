'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faCheckCircle,
  faLandmark,
  faLightbulb,
  faLock,
  faCircleInfo,
  faGavel,
  faBell,
  faUserPlus,
  faCalendar,
  faP,
} from '@fortawesome/pro-solid-svg-icons';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ScoreGauge from '@/components/ui/ScoreGauge';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import IssuerCombobox from '@/components/forms/inputs/IssuerCombobox/IssuerCombobox';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import { Address } from '@parking-ticket-pal/types';

type IssuerType = 'council' | 'private' | null;
type TicketStage = 'initial' | 'nto' | 'rejection' | 'charge_cert' | null;
type ChallengeReason =
  | 'signage'
  | 'grace_period'
  | 'loading'
  | 'disabled'
  | 'emergency'
  | 'other'
  | null;
type UserIntent = 'track' | 'challenge' | null;

export type ExtractedData = {
  issuerType?: IssuerType;
  ticketStage?: TicketStage;
  pcnNumber?: string;
  vehicleReg?: string;
  issueDate?: string;
  location?: string;
  initialAmount?: number;
  issuer?: string;
  imageUrl?: string;
  tempImagePath?: string;
};

type TicketWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  extractedData?: ExtractedData;
  onComplete?: (data: WizardCompleteData) => void;
};

export type WizardCompleteData = {
  issuerType: IssuerType;
  ticketStage: TicketStage;
  pcnNumber: string;
  vehicleReg: string;
  issuer: string;
  issuedAt: Date | null;
  initialAmount: number | null;
  location: Address | null;
  intent: UserIntent;
  challengeReason: ChallengeReason;
  tier: 'premium' | null;
  extractedData?: ExtractedData;
};

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const challengeReasons = [
  {
    id: 'signage',
    label: 'Unclear / Obscured Signage',
    desc: 'Signs were missing, hidden, or confusing',
  },
  {
    id: 'grace_period',
    label: 'Grace Period / Just Over Time',
    desc: 'I was only slightly over the time limit',
  },
  {
    id: 'loading',
    label: 'Loading / Unloading',
    desc: 'I was actively loading or unloading goods',
  },
  {
    id: 'disabled',
    label: 'Blue Badge Holder',
    desc: 'I have a valid disabled parking badge',
  },
  {
    id: 'emergency',
    label: 'Medical / Emergency',
    desc: 'There was an emergency situation',
  },
  {
    id: 'other',
    label: 'Other Reason',
    desc: 'My situation is different',
  },
];

const TicketWizard = ({
  isOpen,
  onClose,
  extractedData,
  onComplete,
}: TicketWizardProps) => {
  const { track } = useAnalytics();
  const hasTrackedOpen = useRef(false);
  const lastTrackedStep = useRef<string | null>(null);
  const hasExtractedData =
    extractedData && Object.keys(extractedData).length > 0;

  // Determine starting step based on extracted data
  const getInitialStep = () => {
    if (hasExtractedData) return 'confirm';
    return 'issuer';
  };

  const [currentStep, setCurrentStep] = useState<
    | 'issuer'
    | 'stage'
    | 'details'
    | 'confirm'
    | 'intent'
    | 'reason'
    | 'result'
    | 'signup'
  >(getInitialStep());
  const [direction, setDirection] = useState(0);

  // Form state
  const [issuerType, setIssuerType] = useState<IssuerType>(
    extractedData?.issuerType || null,
  );
  const [ticketStage, setTicketStage] = useState<TicketStage>(
    extractedData?.ticketStage || null,
  );
  const [pcnNumber, setPcnNumber] = useState(extractedData?.pcnNumber || '');
  const [vehicleReg, setVehicleReg] = useState(extractedData?.vehicleReg || '');
  const [issuer, setIssuer] = useState(extractedData?.issuer || '');
  const [issuedAt, setIssuedAt] = useState<Date | null>(
    extractedData?.issueDate ? new Date(extractedData.issueDate) : null,
  );
  const [initialAmount, setInitialAmount] = useState<number | null>(
    extractedData?.initialAmount ?? null,
  );
  const [location, setLocation] = useState<Address | null>(null);
  const [userIntent, setUserIntent] = useState<UserIntent>(null);
  const [challengeReason, setChallengeReason] = useState<ChallengeReason>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Track wizard opened
  useEffect(() => {
    if (isOpen && !hasTrackedOpen.current) {
      hasTrackedOpen.current = true;
      track(TRACKING_EVENTS.WIZARD_OPENED, {
        source: hasExtractedData ? 'ocr' : 'manual',
        has_image: !!extractedData?.imageUrl,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      });
    }
    if (!isOpen) {
      hasTrackedOpen.current = false;
      lastTrackedStep.current = null;
    }
  }, [isOpen, hasExtractedData, extractedData?.imageUrl, track]);

  const getStepNumber = () => {
    if (hasExtractedData) {
      if (userIntent === 'track') {
        const ocrTrackSteps = ['confirm', 'intent', 'signup'];
        return ocrTrackSteps.indexOf(currentStep) + 1;
      }
      const ocrChallengeSteps = ['confirm', 'intent', 'reason', 'result'];
      return ocrChallengeSteps.indexOf(currentStep) + 1;
    }
    if (userIntent === 'track') {
      const manualTrackSteps = [
        'issuer',
        'stage',
        'details',
        'intent',
        'signup',
      ];
      return manualTrackSteps.indexOf(currentStep) + 1;
    }
    const manualChallengeSteps = [
      'issuer',
      'stage',
      'details',
      'intent',
      'reason',
      'result',
    ];
    return manualChallengeSteps.indexOf(currentStep) + 1;
  };

  const getTotalSteps = () => {
    if (hasExtractedData) {
      return userIntent === 'track' ? 3 : 4;
    }
    return userIntent === 'track' ? 5 : 6;
  };

  // Track step views
  useEffect(() => {
    if (isOpen && currentStep !== lastTrackedStep.current) {
      lastTrackedStep.current = currentStep;
      track(TRACKING_EVENTS.WIZARD_STEP_VIEWED, {
        step_name: currentStep,
        step_number: getStepNumber(),
        total_steps: getTotalSteps(),
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep, track]);

  const goToStep = (
    step:
      | 'issuer'
      | 'stage'
      | 'details'
      | 'confirm'
      | 'intent'
      | 'reason'
      | 'result'
      | 'signup',
    selection?: string,
  ) => {
    const stepOrder = [
      'issuer',
      'stage',
      'details',
      'confirm',
      'intent',
      'reason',
      'result',
      'signup',
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    const nextIndex = stepOrder.indexOf(step);
    const isForward = nextIndex > currentIndex;

    // Track step completion when moving forward
    if (isForward) {
      track(TRACKING_EVENTS.WIZARD_STEP_COMPLETED, {
        step_name: currentStep,
        selection: selection || null,
      });
    }

    setDirection(isForward ? 1 : -1);
    setCurrentStep(step);
  };

  const handleTierSelect = () => {
    track(TRACKING_EVENTS.WIZARD_COMPLETED, {
      intent: 'challenge',
      tier: 'premium',
      total_steps: getTotalSteps(),
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      challenge_reason: challengeReason,
    });

    if (onComplete) {
      onComplete({
        issuerType,
        ticketStage,
        pcnNumber,
        vehicleReg,
        issuer,
        issuedAt,
        initialAmount,
        location,
        intent: 'challenge',
        challengeReason,
        tier: 'premium',
        extractedData,
      });
    }
  };

  const handleTrackSignup = () => {
    track(TRACKING_EVENTS.WIZARD_COMPLETED, {
      intent: 'track',
      tier: null,
      total_steps: getTotalSteps(),
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      challenge_reason: null,
    });

    if (onComplete) {
      onComplete({
        issuerType,
        ticketStage,
        pcnNumber,
        vehicleReg,
        issuer,
        issuedAt,
        initialAmount,
        location,
        intent: 'track',
        challengeReason: null,
        tier: null,
        extractedData,
      });
    }
  };

  const handleClose = () => {
    // Track abandonment if wizard wasn't completed
    track(TRACKING_EVENTS.WIZARD_ABANDONED, {
      last_step: currentStep,
      intent: userIntent,
      step_number: getStepNumber(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-2 text-sm font-medium text-gray hover:text-dark"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Cancel
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal">
            Ticket Wizard
          </span>
        </div>

        {/* Content */}
        <div className="relative min-h-[400px] overflow-hidden px-6 py-6">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step: Issuer Type */}
            {currentStep === 'issuer' && (
              <motion.div
                key="issuer"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  className="mb-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-gray hover:bg-light"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  Step {getStepNumber()} of {getTotalSteps()}: Who issued your
                  ticket?
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Check the top of your letter or ticket.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIssuerType('council');
                      goToStep('stage');
                    }}
                    className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      issuerType === 'council'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/10">
                      <FontAwesomeIcon
                        icon={faLandmark}
                        className="text-amber"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-dark">
                        A Local Council / Authority
                      </p>
                      <p className="mt-0.5 text-sm text-gray">
                        It says{' '}
                        <span className="font-medium text-dark">
                          &quot;Penalty Charge Notice&quot;
                        </span>{' '}
                        (PCN). It mentions the{' '}
                        <em>Traffic Management Act 2004</em>.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIssuerType('private');
                      goToStep('stage');
                    }}
                    className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      issuerType === 'private'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <FontAwesomeIcon icon={faP} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-dark">
                        A Private Company
                      </p>
                      <p className="mt-0.5 text-sm text-gray">
                        It says{' '}
                        <span className="font-medium text-dark">
                          &quot;Parking Charge Notice&quot;
                        </span>
                        . Issued by companies like ParkingEye, APCOA, Euro Car
                        Parks.
                      </p>
                    </div>
                  </button>
                </div>

                <details className="mt-4">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-teal">
                    <FontAwesomeIcon icon={faCircleInfo} />
                    How to tell the difference
                  </summary>
                  <p className="mt-2 rounded-lg bg-light p-3 text-sm text-gray">
                    Council tickets are issued by local authorities for
                    on-street parking or council car parks. Private tickets come
                    from companies managing private land like supermarkets,
                    retail parks, or private car parks.
                  </p>
                </details>
              </motion.div>
            )}

            {/* Step: Ticket Stage */}
            {currentStep === 'stage' && (
              <motion.div
                key="stage"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => goToStep('issuer')}
                  className="mb-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-gray hover:bg-light"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  Step {getStepNumber()} of {getTotalSteps()}: What stage are
                  you at?
                </h2>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTicketStage('initial');
                      goToStep('details');
                    }}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      ticketStage === 'initial'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <p className="font-semibold text-dark">Initial Ticket</p>
                    <p className="mt-0.5 text-sm text-gray">
                      Just received - on windscreen or in the post. I
                      haven&apos;t appealed yet.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTicketStage('nto');
                      goToStep('details');
                    }}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      ticketStage === 'nto'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <p className="font-semibold text-dark">
                      &apos;Notice to Owner&apos; (NtO)
                    </p>
                    <p className="mt-0.5 text-sm text-gray">
                      I have received a formal &quot;Notice to Owner&quot;
                      letter in the post asking for the full amount.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTicketStage('rejection');
                      goToStep('details');
                    }}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      ticketStage === 'rejection'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <p className="font-semibold text-dark">
                      Rejection / Tribunal
                    </p>
                    <p className="mt-0.5 text-sm text-gray">
                      The Council rejected my formal representation and I want
                      to go to the independent tribunal.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTicketStage('charge_cert');
                      goToStep('details');
                    }}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      ticketStage === 'charge_cert'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <p className="font-semibold text-dark">
                      Charge Certificate / Bailiffs
                    </p>
                    <p className="mt-0.5 text-sm text-gray">
                      I have received a Charge Certificate or Order for
                      Recovery. It is urgent.
                    </p>
                  </button>
                </div>

                <div className="mt-4 rounded-lg bg-yellow/20 p-3">
                  <p className="flex items-start gap-2 text-sm">
                    <FontAwesomeIcon
                      icon={faLightbulb}
                      className="mt-0.5 text-amber"
                    />
                    <span>
                      <strong>Pro Tip: The 14-Day Rule</strong>
                      <br />
                      Most Councils will &quot;freeze&quot; the 50% discount if
                      you appeal informally within the first 14 days. If they
                      reject you, they usually re-offer the 14 days to pay.
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step: Details (Manual flow) */}
            {currentStep === 'details' && (
              <motion.div
                key="details"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => goToStep('stage')}
                  className="mb-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-gray hover:bg-light"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  Step {getStepNumber()} of {getTotalSteps()}: Enter your ticket
                  details
                </h2>
                <p className="mt-1 text-sm text-gray">
                  You can find these on your ticket or letter.
                </p>

                <div className="mt-6 flex max-h-[320px] flex-col gap-4 overflow-y-auto pr-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      PCN / Reference Number *
                    </label>
                    <Input
                      value={pcnNumber}
                      onChange={(e) => setPcnNumber(e.target.value)}
                      placeholder="e.g. WK12345678"
                      className="h-11"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Vehicle Registration *
                    </label>
                    <Input
                      value={vehicleReg}
                      onChange={(e) =>
                        setVehicleReg(e.target.value.toUpperCase())
                      }
                      placeholder="e.g. AB12 CDE"
                      className="h-11 uppercase"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Issuer *
                    </label>
                    <IssuerCombobox
                      issuerType={issuerType}
                      value={issuer}
                      onSelect={setIssuer}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Issue Date *
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`flex h-11 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background ${
                            issuedAt ? 'text-dark' : 'text-muted-foreground'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={faCalendar}
                            className="mr-2 text-gray"
                          />
                          {issuedAt
                            ? format(issuedAt, 'dd MMM yyyy')
                            : 'Pick a date'}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={issuedAt ?? undefined}
                          onSelect={(day) => setIssuedAt(day ?? null)}
                          disabled={{ after: new Date() }}
                          defaultMonth={issuedAt ?? undefined}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Amount (£) *
                    </label>
                    <Input
                      type="number"
                      value={initialAmount !== null ? initialAmount / 100 : ''}
                      onChange={(e) =>
                        setInitialAmount(
                          e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : null,
                        )
                      }
                      placeholder="e.g. 70"
                      min="0"
                      step="0.01"
                      className="h-11"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Location *
                    </label>
                    <AddressInput onSelect={setLocation} className="h-11" />
                  </div>
                </div>

                <Button
                  onClick={() => goToStep('intent')}
                  disabled={
                    !pcnNumber.trim() ||
                    !vehicleReg.trim() ||
                    !issuer.trim() ||
                    !issuedAt ||
                    !initialAmount ||
                    !location
                  }
                  className="mt-6 h-11 w-full bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  Continue
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step: Confirm Extracted Data (OCR flow) */}
            {currentStep === 'confirm' && (
              <motion.div
                key="confirm"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Details extracted from your photo
                </div>

                <h2 className="text-xl font-bold text-dark">
                  Step {getStepNumber()} of {getTotalSteps()}: Confirm your
                  details
                </h2>
                <p className="mt-1 text-sm text-gray">
                  We extracted these details. Please check they&apos;re correct.
                </p>

                <div className="mt-6 flex max-h-[320px] flex-col gap-4 overflow-y-auto pr-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      PCN Reference *
                    </label>
                    <Input
                      value={pcnNumber}
                      onChange={(e) => setPcnNumber(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Vehicle Registration *
                    </label>
                    <Input
                      value={vehicleReg}
                      onChange={(e) =>
                        setVehicleReg(e.target.value.toUpperCase())
                      }
                      className="h-11 uppercase"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Ticket Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIssuerType('council')}
                        className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                          issuerType === 'council'
                            ? 'border-teal bg-teal/5 text-teal'
                            : 'border-border text-gray hover:border-gray'
                        }`}
                      >
                        Council PCN
                      </button>
                      <button
                        type="button"
                        onClick={() => setIssuerType('private')}
                        className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                          issuerType === 'private'
                            ? 'border-teal bg-teal/5 text-teal'
                            : 'border-border text-gray hover:border-gray'
                        }`}
                      >
                        Private PCN
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Current Stage
                    </label>
                    <select
                      value={ticketStage || ''}
                      onChange={(e) =>
                        setTicketStage(e.target.value as TicketStage)
                      }
                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="initial">
                        Initial Ticket (just received)
                      </option>
                      <option value="nto">Notice to Owner (NtO)</option>
                      <option value="rejection">Rejection / Tribunal</option>
                      <option value="charge_cert">
                        Charge Certificate / Bailiffs
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Issuer *
                    </label>
                    <IssuerCombobox
                      issuerType={issuerType}
                      value={issuer}
                      onSelect={setIssuer}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Issue Date *
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`flex h-11 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background ${
                            issuedAt ? 'text-dark' : 'text-muted-foreground'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={faCalendar}
                            className="mr-2 text-gray"
                          />
                          {issuedAt
                            ? format(issuedAt, 'dd MMM yyyy')
                            : 'Pick a date'}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={issuedAt ?? undefined}
                          onSelect={(day) => setIssuedAt(day ?? null)}
                          disabled={{ after: new Date() }}
                          defaultMonth={issuedAt ?? undefined}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Amount (£) *
                    </label>
                    <Input
                      type="number"
                      value={initialAmount !== null ? initialAmount / 100 : ''}
                      onChange={(e) =>
                        setInitialAmount(
                          e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : null,
                        )
                      }
                      placeholder="e.g. 70"
                      min="0"
                      step="0.01"
                      className="h-11"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-dark">
                      Location *
                    </label>
                    <AddressInput onSelect={setLocation} className="h-11" />
                  </div>
                </div>

                <Button
                  onClick={() => goToStep('intent')}
                  disabled={
                    !pcnNumber.trim() ||
                    !vehicleReg.trim() ||
                    !issuer.trim() ||
                    !issuedAt ||
                    !initialAmount ||
                    !location
                  }
                  className="mt-6 h-11 w-full bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  Continue
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step: Intent - Track or Challenge */}
            {currentStep === 'intent' && (
              <motion.div
                key="intent"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() =>
                    goToStep(hasExtractedData ? 'confirm' : 'details')
                  }
                  className="mb-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-gray hover:bg-light"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  Step {getStepNumber()} of {getTotalSteps()}: What would you
                  like to do?
                </h2>
                <p className="mt-1 text-sm text-gray">
                  You can track your ticket or challenge it right away.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUserIntent('track');
                      track(TRACKING_EVENTS.WIZARD_INTENT_SELECTED, {
                        intent: 'track',
                      });
                      goToStep('signup', 'track');
                    }}
                    className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      userIntent === 'track'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10">
                      <FontAwesomeIcon icon={faBell} className="text-teal" />
                    </div>
                    <div>
                      <p className="font-semibold text-dark">
                        Just track my ticket
                      </p>
                      <p className="mt-0.5 text-sm text-gray">
                        Get reminders before deadlines and keep all your tickets
                        in one place. Free to start.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserIntent('challenge');
                      track(TRACKING_EVENTS.WIZARD_INTENT_SELECTED, {
                        intent: 'challenge',
                      });
                      goToStep('reason', 'challenge');
                    }}
                    className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-teal ${
                      userIntent === 'challenge'
                        ? 'border-teal bg-teal/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/10">
                      <FontAwesomeIcon icon={faGavel} className="text-amber" />
                    </div>
                    <div>
                      <p className="font-semibold text-dark">
                        I want to challenge it
                      </p>
                      <p className="mt-0.5 text-sm text-gray">
                        Get your success score, AI-generated appeal letter, and
                        optional auto-submission. Just £14.99.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="mt-4 rounded-lg bg-light p-3">
                  <p className="flex items-start gap-2 text-sm text-gray">
                    <FontAwesomeIcon
                      icon={faCircleInfo}
                      className="mt-0.5 text-teal"
                    />
                    <span>
                      Not sure yet? Track your ticket now and decide later. You
                      can always challenge from your dashboard.
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step: Challenge Reason */}
            {currentStep === 'reason' && (
              <motion.div
                key="reason"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => goToStep('intent')}
                  className="mb-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-gray hover:bg-light"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  Step {getStepNumber()} of {getTotalSteps()}: Why do you want
                  to challenge?
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Select the reason that best matches your situation.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                  {challengeReasons.map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => {
                        setChallengeReason(reason.id as ChallengeReason);
                        track(
                          TRACKING_EVENTS.WIZARD_CHALLENGE_REASON_SELECTED,
                          {
                            reason: reason.id,
                          },
                        );
                        goToStep('result', reason.id);
                      }}
                      className={`rounded-lg border-2 p-3 text-left transition-all hover:border-teal ${
                        challengeReason === reason.id
                          ? 'border-teal bg-teal/5'
                          : 'border-border'
                      }`}
                    >
                      <p className="font-medium text-dark">{reason.label}</p>
                      <p className="text-xs text-gray">{reason.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step: Result / Score Gate */}
            {currentStep === 'result' && (
              <motion.div
                key="result"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => goToStep('reason')}
                  className="mb-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-gray hover:bg-light"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  We&apos;ve analysed your ticket
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Based on your details, here&apos;s what we found.
                </p>

                {/* Blurred Score Card */}
                <div className="mt-6 rounded-xl border-2 border-dashed border-teal/30 bg-teal/5 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray">
                        Challenge Success Score
                      </p>
                      <div className="mt-2">
                        <ScoreGauge score={73} size="md" locked showLabel />
                      </div>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal/10">
                      <FontAwesomeIcon
                        icon={faLock}
                        className="text-xl text-teal"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray">
                    Unlock your score to see if it&apos;s worth challenging.
                  </p>
                </div>

                {/* Blurred Letter Preview */}
                <div className="mt-4 rounded-lg border border-border bg-light p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-dark">
                      Challenge Letter Ready
                    </span>
                    <span className="flex items-center gap-1 rounded bg-amber/20 px-2 py-0.5 text-xs font-medium text-amber">
                      <FontAwesomeIcon icon={faLock} className="text-[10px]" />
                      Locked
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2.5 w-full rounded bg-gray/20" />
                    <div className="h-2.5 w-4/5 rounded bg-gray/20" />
                    <div className="h-2.5 w-3/4 rounded bg-gray/20" />
                    <div className="h-2.5 w-5/6 rounded bg-gray/20" />
                  </div>
                </div>

                {/* Conversion CTA */}
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleTierSelect}
                    className="relative flex flex-col items-center rounded-xl border-2 border-dark bg-dark p-5 text-center"
                  >
                    <span className="text-2xl font-bold text-white">
                      £14.99
                    </span>
                    <span className="mt-1 text-sm font-medium text-white">
                      Upgrade to Premium
                    </span>
                    <span className="mt-1 text-xs text-white/70">
                      Success score + AI letter + auto-submit
                    </span>
                  </button>
                </div>

                <p className="mt-4 text-center text-xs text-gray">
                  Challenge your ticket for just £14.99. Includes success
                  prediction, AI-powered challenge letter, and optional
                  auto-submission.
                </p>
              </motion.div>
            )}

            {/* Step: Signup (Track flow) */}
            {currentStep === 'signup' && (
              <motion.div
                key="signup"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => goToStep('intent')}
                  className="mb-4 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-gray hover:bg-light"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Ticket details saved
                </div>

                <h2 className="text-xl font-bold text-dark">
                  Create your free account
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Sign up to save your ticket and get deadline reminders.
                </p>

                <div className="mt-6 rounded-xl border border-border bg-light/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/20">
                      <FontAwesomeIcon
                        icon={faBell}
                        className="text-sm text-teal"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-dark">
                        What you&apos;ll get:
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-gray">
                        <li className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="text-xs text-teal"
                          />
                          Deadline reminders before you miss discounts
                        </li>
                        <li className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="text-xs text-teal"
                          />
                          All your tickets in one dashboard
                        </li>
                        <li className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="text-xs text-teal"
                          />
                          Challenge any ticket later if you change your mind
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleTrackSignup}
                  className="mt-6 h-11 w-full gap-2 bg-teal text-white hover:bg-teal-dark"
                >
                  <FontAwesomeIcon icon={faUserPlus} />
                  Create Free Account
                </Button>

                <p className="mt-4 text-center text-xs text-gray">
                  No credit card required. Your ticket will be waiting for you.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TicketWizard;
