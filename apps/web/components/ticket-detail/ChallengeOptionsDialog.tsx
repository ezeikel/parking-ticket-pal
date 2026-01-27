'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot,
  faEnvelope,
  faArrowRight,
  faSpinnerThird,
  faCircleInfo,
  faWandMagicSparkles,
} from '@fortawesome/pro-solid-svg-icons';
import { IssuerType } from '@parking-ticket-pal/db/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { initiateAutoChallenge } from '@/app/actions/autoChallenge';
import { generateChallengeLetter } from '@/app/actions/letter';
import { getChallengeReasons } from '@/constants';

type ChallengeOptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  issuerName: string;
  issuerType?: IssuerType;
};

type ChallengeMethod = 'auto' | 'letter';
type Step = 'choose' | 'auto-details' | 'letter-details';

const ChallengeOptionsDialog = ({
  open,
  onOpenChange,
  ticketId,
  issuerName,
  issuerType = IssuerType.COUNCIL,
}: ChallengeOptionsDialogProps) => {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get challenge reasons based on issuer type
  const challengeReasons = getChallengeReasons(issuerType);

  const handleMethodSelect = (selectedMethod: ChallengeMethod) => {
    if (selectedMethod === 'letter') {
      setStep('letter-details');
    } else {
      setStep('auto-details');
    }
  };

  const handleBack = () => {
    setStep('choose');
    setReason('');
    setCustomReason('');
  };

  const handleAutoSubmit = async () => {
    if (!reason) return;

    setIsSubmitting(true);
    try {
      const result = await initiateAutoChallenge(
        ticketId,
        reason,
        reason === 'OTHER' ? customReason : undefined,
      );

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLetterSubmit = async () => {
    if (!reason) return;

    const selectedReasonData =
      challengeReasons[reason as keyof typeof challengeReasons];
    if (!selectedReasonData) return;

    setIsSubmitting(true);
    try {
      const result = await generateChallengeLetter(
        ticketId,
        reason,
        customReason || undefined,
      );

      if (result?.success) {
        toast.success(result.message);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result?.message || 'Failed to generate challenge letter');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReason = reason
    ? challengeReasons[reason as keyof typeof challengeReasons]
    : null;

  const getDialogTitle = () => {
    if (step === 'choose') return 'Challenge Ticket';
    if (step === 'letter-details') return 'Generate Challenge Letter';
    return 'Auto-Submit Challenge';
  };

  const getDialogDescription = () => {
    if (step === 'choose') return 'Choose how you want to challenge this ticket';
    if (step === 'letter-details')
      return "We'll create a professional challenge letter and email it to you.";
    return `Submit your challenge to ${issuerName}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'letter-details' && (
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-teal" />
            )}
            {step === 'auto-details' && (
              <FontAwesomeIcon icon={faRobot} className="text-teal" />
            )}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {step === 'choose' ? (
          <div className="space-y-3 py-4">
            {/* Auto Challenge Option */}
            <button
              onClick={() => handleMethodSelect('auto')}
              className="w-full rounded-lg border-2 border-gray/20 p-4 text-left transition-all hover:border-teal hover:bg-teal/5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/10">
                  <FontAwesomeIcon icon={faRobot} className="text-teal" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-dark">
                      Auto-Submit Challenge
                    </span>
                    <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray">
                    We&apos;ll automatically fill and submit the challenge form on the issuer&apos;s website
                  </p>
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="mt-3 text-gray"
                />
              </div>
            </button>

            {/* Letter Option */}
            <button
              onClick={() => handleMethodSelect('letter')}
              className="w-full rounded-lg border-2 border-gray/20 p-4 text-left transition-all hover:border-teal hover:bg-teal/5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange/10">
                  <FontAwesomeIcon icon={faEnvelope} className="text-orange" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-dark">
                    Generate Challenge Letter
                  </span>
                  <p className="mt-1 text-sm text-gray">
                    Get an AI-generated letter to send by email or post
                  </p>
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="mt-3 text-gray"
                />
              </div>
            </button>
          </div>
        ) : step === 'auto-details' ? (
          <div className="space-y-4 py-4">
            {/* Reason Select */}
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium text-dark">
                Challenge Reason
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason for your challenge" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(challengeReasons).map(([key, r]) => (
                    <SelectItem key={key} value={key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReason && (
                <p className="text-xs text-gray">{selectedReason.description}</p>
              )}
            </div>

            {/* Custom reason textarea */}
            {reason === 'OTHER' && (
              <div className="space-y-2">
                <label
                  htmlFor="customReason"
                  className="text-sm font-medium text-dark"
                >
                  Describe your reason
                </label>
                <Textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why you believe this ticket should be cancelled..."
                  rows={3}
                />
              </div>
            )}

            {/* Info box */}
            <div className="rounded-lg bg-teal/5 p-3">
              <div className="flex gap-2">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="mt-0.5 text-teal"
                />
                <div className="text-sm text-dark">
                  <p className="font-medium">How it works</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-gray">
                    <li>We open the issuer&apos;s website</li>
                    <li>Fill in your PCN and vehicle details</li>
                    <li>Submit your challenge automatically</li>
                    <li>You&apos;ll receive confirmation when complete</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleAutoSubmit}
                disabled={
                  !reason ||
                  (reason === 'OTHER' && !customReason.trim()) ||
                  isSubmitting
                }
                className="flex-1 gap-2 bg-teal text-white hover:bg-teal-dark"
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinnerThird}
                      className="animate-spin"
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faRobot} />
                    Submit Challenge
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Letter details step */
          <div className="space-y-4 py-4">
            {/* Reason Select */}
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium text-dark">
                Challenge Reason
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason for your challenge" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(challengeReasons).map(([key, r]) => (
                    <SelectItem key={key} value={key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReason && (
                <p className="text-xs text-gray">{selectedReason.description}</p>
              )}
            </div>

            {/* Additional details textarea */}
            <div className="space-y-2">
              <label
                htmlFor="customReason"
                className="text-sm font-medium text-dark"
              >
                Additional Details (optional)
              </label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Add any specific details about your situation..."
                rows={3}
              />
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-teal/5 p-3">
              <div className="flex gap-2">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="mt-0.5 text-teal"
                />
                <div className="text-sm text-dark">
                  <p className="font-medium">What happens next</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-gray">
                    <li>AI generates a professional challenge letter</li>
                    <li>Letter includes your signature (if saved)</li>
                    <li>PDF is emailed to you</li>
                    <li>Print and post to the issuer</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleLetterSubmit}
                disabled={!reason || isSubmitting}
                className="flex-1 gap-2 bg-teal text-white hover:bg-teal-dark"
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinnerThird}
                      className="animate-spin"
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faEnvelope} />
                    Generate & Email Letter
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeOptionsDialog;
