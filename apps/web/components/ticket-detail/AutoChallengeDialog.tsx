'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faSpinner, faCircleInfo } from '@fortawesome/pro-solid-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

type AutoChallengeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issuerName: string;
  onSubmit: (reason: string, customReason?: string) => Promise<void>;
};

const CHALLENGE_REASONS = [
  { value: 'SIGNAGE_ISSUE', label: 'Inadequate Signage', description: 'Signs were missing, obscured, or unclear' },
  { value: 'VEHICLE_STOLEN', label: 'Vehicle Was Stolen', description: 'Your vehicle was stolen at the time' },
  { value: 'NOT_VEHICLE_OWNER', label: 'Not Vehicle Owner', description: 'You were not the owner/keeper at the time' },
  { value: 'ALREADY_PAID', label: 'Already Paid', description: 'Payment was made but not registered' },
  { value: 'INVALID_TMO', label: 'Invalid TMO', description: 'Traffic Management Order was invalid' },
  { value: 'HIRE_FIRM', label: 'Hire Vehicle', description: 'Vehicle was on hire to another person' },
  { value: 'MITIGATING_CIRCUMSTANCES', label: 'Mitigating Circumstances', description: 'Special circumstances prevented compliance' },
  { value: 'PROCEDURAL_ERROR', label: 'Procedural Error', description: 'The PCN was issued incorrectly' },
  { value: 'OTHER', label: 'Other Reason', description: 'Specify your own reason' },
] as const;

const AutoChallengeDialog = ({
  open,
  onOpenChange,
  issuerName,
  onSubmit,
}: AutoChallengeDialogProps) => {
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;

    setIsSubmitting(true);
    try {
      await onSubmit(reason, reason === 'OTHER' ? customReason : undefined);
      onOpenChange(false);
      setReason('');
      setCustomReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReason = CHALLENGE_REASONS.find((r) => r.value === reason);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faRobot} className="text-teal" />
            Auto-Submit Challenge
          </DialogTitle>
          <DialogDescription>
            We&apos;ll automatically submit your challenge to {issuerName} using browser automation.
          </DialogDescription>
        </DialogHeader>

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
                {CHALLENGE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
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
              <label htmlFor="customReason" className="text-sm font-medium text-dark">
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
              <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 text-teal" />
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || (reason === 'OTHER' && !customReason.trim()) || isSubmitting}
            className="gap-2 bg-teal text-white hover:bg-teal-dark"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faRobot} />
                Submit Challenge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoChallengeDialog;
