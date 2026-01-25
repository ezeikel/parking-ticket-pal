'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faSpinnerThird,
  faCircleInfo,
  faEnvelope,
} from '@fortawesome/pro-solid-svg-icons';
import { IssuerType } from '@parking-ticket-pal/db/types';
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
import { getChallengeReasons } from '@/constants';

type GenerateLetterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issuerType: IssuerType;
  onSubmit: (
    reason: string,
    reasonLabel: string,
    customReason?: string,
  ) => Promise<void>;
};

const GenerateLetterDialog = ({
  open,
  onOpenChange,
  issuerType,
  onSubmit,
}: GenerateLetterDialogProps) => {
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const challengeReasons = getChallengeReasons(issuerType);

  const handleSubmit = async () => {
    if (!reason) return;

    const selectedReason =
      challengeReasons[reason as keyof typeof challengeReasons];
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await onSubmit(reason, selectedReason.label, customReason || undefined);
      onOpenChange(false);
      setReason('');
      setCustomReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReason = reason
    ? challengeReasons[reason as keyof typeof challengeReasons]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-teal" />
            Generate Challenge Letter
          </DialogTitle>
          <DialogDescription>
            We&apos;ll create a professional challenge letter based on your
            reason and email it to you.
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
            disabled={!reason || isSubmitting}
            className="gap-2 bg-teal text-white hover:bg-teal-dark"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateLetterDialog;
