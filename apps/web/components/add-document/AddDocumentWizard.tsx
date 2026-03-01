'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheckCircle,
  faLandmark,
  faLightbulb,
  faCircleInfo,
  faSpinnerThird,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import IssuerCombobox from '@/components/forms/inputs/IssuerCombobox/IssuerCombobox';
import { Address } from '@parking-ticket-pal/types';

type IssuerType = 'council' | 'private' | null;
type TicketStage = 'initial' | 'nto' | 'rejection' | 'charge_cert' | null;

export type ExtractedData = {
  issuerType?: IssuerType;
  ticketStage?: TicketStage;
  pcnNumber?: string;
  vehicleReg?: string;
  issuedAt?: Date;
  location?: Address;
  initialAmount?: number;
  issuer?: string;
  contraventionCode?: string;
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
};

export type WizardFormData = {
  issuerType: IssuerType;
  ticketStage: TicketStage;
  pcnNumber: string;
  vehicleReg: string;
  issuedAt?: Date;
  location?: Address;
  initialAmount?: number;
  issuer?: string;
  contraventionCode?: string;
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
};

type AddDocumentWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  extractedData?: ExtractedData;
  onSubmit: (data: WizardFormData) => Promise<void>;
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

const AddDocumentWizard = ({
  isOpen,
  onClose,
  extractedData,
  onSubmit,
}: AddDocumentWizardProps) => {
  const hasExtractedData =
    extractedData && Object.keys(extractedData).length > 0;

  const getInitialStep = () => {
    if (hasExtractedData) return 'confirm';
    return 'issuer';
  };

  const [currentStep, setCurrentStep] = useState<
    'issuer' | 'stage' | 'details' | 'confirm'
  >(getInitialStep());
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [issuerType, setIssuerType] = useState<IssuerType>(
    extractedData?.issuerType || null,
  );
  const [ticketStage, setTicketStage] = useState<TicketStage>(
    extractedData?.ticketStage || 'initial',
  );
  const [pcnNumber, setPcnNumber] = useState(extractedData?.pcnNumber || '');
  const [vehicleReg, setVehicleReg] = useState(extractedData?.vehicleReg || '');
  const [issuedAt, setIssuedAt] = useState<Date | undefined>(
    extractedData?.issuedAt,
  );
  const [location, setLocation] = useState<Address | undefined>(
    extractedData?.location,
  );
  const [initialAmount, setInitialAmount] = useState<number | undefined>(
    extractedData?.initialAmount,
  );
  const [issuer, setIssuer] = useState(extractedData?.issuer || '');

  const goToStep = (step: 'issuer' | 'stage' | 'details' | 'confirm') => {
    const stepOrder = ['issuer', 'stage', 'details', 'confirm'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const nextIndex = stepOrder.indexOf(step);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setCurrentStep(step);
  };

  const getStepNumber = () => {
    if (hasExtractedData) {
      return 1; // OCR flow has single confirm step
    }
    const manualSteps = ['issuer', 'stage', 'details'];
    return manualSteps.indexOf(currentStep) + 1;
  };

  const getTotalSteps = () => (hasExtractedData ? 1 : 3);

  const isDetailsComplete =
    pcnNumber.trim() &&
    vehicleReg.trim() &&
    issuer.trim() &&
    issuedAt &&
    initialAmount &&
    location;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        issuerType,
        ticketStage,
        pcnNumber,
        vehicleReg,
        issuedAt,
        location,
        initialAmount,
        issuer,
        imageUrl: extractedData?.imageUrl,
        tempImagePath: extractedData?.tempImagePath,
        extractedText: extractedData?.extractedText,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
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
          <span className="text-sm font-medium text-gray">
            Step {getStepNumber()} of {getTotalSteps()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray hover:text-dark"
          >
            Cancel
          </button>
        </div>

        {/* Content */}
        <div className="relative min-h-[420px] overflow-hidden px-6 py-6">
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
                <h2 className="text-xl font-bold text-dark">
                  Who issued your ticket?
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Check the top of your letter or ticket.
                </p>
                <p className="mt-1 text-xs text-gray/70">
                  This helps us find the right appeal process and deadlines for
                  you.
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
                        (PCN)
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
                    on-street parking. Private tickets come from companies
                    managing private land like supermarkets or retail parks.
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
                  className="mb-4 flex items-center gap-2 text-sm text-gray hover:text-dark"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  What stage are you at?
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Different stages have different deadlines and options —
                  we&apos;ll tailor your next steps.
                </p>

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
                      Just received - on windscreen or in the post
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
                      Notice to Owner (NtO)
                    </p>
                    <p className="mt-0.5 text-sm text-gray">
                      Formal notice asking for the full amount
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
                      Appeal was rejected, considering tribunal
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
                      Urgent - enforcement stage
                    </p>
                  </button>
                </div>

                <div className="mt-4 rounded-lg bg-amber/10 p-3">
                  <p className="flex items-start gap-2 text-sm">
                    <FontAwesomeIcon
                      icon={faLightbulb}
                      className="mt-0.5 text-amber"
                    />
                    <span>
                      <strong>Pro Tip:</strong> Most councils will
                      &quot;freeze&quot; the 50% discount if you appeal within
                      14 days.
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step: Ticket Details (Manual flow — merged basic + additional) */}
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
                  className="mb-4 flex items-center gap-2 text-sm text-gray hover:text-dark"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back
                </button>

                <h2 className="text-xl font-bold text-dark">
                  Enter your ticket details
                </h2>
                <p className="mt-1 text-sm text-gray">
                  We use these to track your ticket and calculate your appeal
                  chances.
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
                          selected={issuedAt}
                          onSelect={(day) => setIssuedAt(day ?? undefined)}
                          disabled={{ after: new Date() }}
                          defaultMonth={issuedAt}
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
                      value={initialAmount ? initialAmount / 100 : ''}
                      onChange={(e) =>
                        setInitialAmount(
                          e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : undefined,
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
                    <AddressInput
                      onSelect={setLocation}
                      initialValue={
                        location?.line1
                          ? `${location.line1}, ${location.city}`
                          : undefined
                      }
                      className="h-11"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!isDetailsComplete || isSubmitting}
                  className="mt-6 h-11 w-full bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon
                        icon={faSpinnerThird}
                        className="mr-2 animate-spin"
                      />
                      Creating ticket...
                    </>
                  ) : (
                    <>
                      Add Ticket
                      <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
                    </>
                  )}
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
                  Confirm your details
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Please check these are correct.
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
                      Ticket Type *
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
                    <Select
                      value={ticketStage || 'initial'}
                      onValueChange={(v) => setTicketStage(v as TicketStage)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial">
                          Initial Ticket (just received)
                        </SelectItem>
                        <SelectItem value="nto">
                          Notice to Owner (NtO)
                        </SelectItem>
                        <SelectItem value="rejection">
                          Rejection / Tribunal
                        </SelectItem>
                        <SelectItem value="charge_cert">
                          Charge Certificate / Bailiffs
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                          selected={issuedAt}
                          onSelect={(day) => setIssuedAt(day ?? undefined)}
                          disabled={{ after: new Date() }}
                          defaultMonth={issuedAt}
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
                      value={initialAmount ? initialAmount / 100 : ''}
                      onChange={(e) =>
                        setInitialAmount(
                          e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : undefined,
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
                    <AddressInput
                      onSelect={setLocation}
                      initialValue={
                        location?.line1
                          ? `${location.line1}, ${location.city}`
                          : undefined
                      }
                      className="h-11"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!isDetailsComplete || isSubmitting}
                  className="mt-6 h-11 w-full bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon
                        icon={faSpinnerThird}
                        className="mr-2 animate-spin"
                      />
                      Creating ticket...
                    </>
                  ) : (
                    <>
                      Add Ticket
                      <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddDocumentWizard;
