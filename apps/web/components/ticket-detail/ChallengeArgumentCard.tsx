'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faRotate,
  faChevronDown,
  faSpinnerThird,
  faCheck,
  faLock,
} from '@fortawesome/pro-solid-svg-icons';
import { faCopy } from '@fortawesome/pro-regular-svg-icons';
import { IssuerType, TicketTier } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateChallengeText,
  saveChallengeText,
} from '@/app/actions/challenge';
import { getChallengeReasons } from '@/constants';

type ChallengeArgumentCardProps = {
  ticketId: string;
  issuerType: IssuerType;
  tier: TicketTier;
  existingChallenge?: {
    id: string;
    reason: string;
    customReason?: string | null;
    challengeText?: string | null;
    additionalInfo?: string | null;
    challengeTextGeneratedAt?: Date | null;
  } | null;
  onSendLetter?: () => void;
  onAutoChallenge?: () => void;
  onUpgrade?: () => void;
};

const ChallengeArgumentCard = ({
  ticketId,
  issuerType,
  tier,
  existingChallenge,
  onSendLetter,
  onAutoChallenge,
  onUpgrade,
}: ChallengeArgumentCardProps) => {
  const isPremium = tier === TicketTier.PREMIUM;
  const router = useRouter();
  const [challengeText, setChallengeText] = useState(
    existingChallenge?.challengeText || '',
  );
  const [additionalInfo, setAdditionalInfo] = useState(
    existingChallenge?.additionalInfo || '',
  );
  const [reason, setReason] = useState(existingChallenge?.reason || '');
  const [challengeId, setChallengeId] = useState(existingChallenge?.id || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(
    !!existingChallenge?.challengeText,
  );
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(
    !!existingChallenge?.additionalInfo,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reasons = getChallengeReasons(issuerType);
  const reasonEntries = Object.entries(reasons);

  // Debounced auto-save
  const debouncedSave = useCallback(
    (text: string, info?: string) => {
      if (!challengeId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        await saveChallengeText(challengeId, {
          challengeText: text,
          ...(info !== undefined && { additionalInfo: info }),
        });
        setIsSaving(false);
      }, 1500);
    },
    [challengeId],
  );

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const handleTextChange = (text: string) => {
    setChallengeText(text);
    if (hasGenerated) {
      debouncedSave(text);
    }
  };

  const handleGenerate = async () => {
    if (!reason) {
      toast.error('Please select a challenge reason first');
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateChallengeText(
        ticketId,
        reason,
        additionalInfo || undefined,
      );

      if (result.success && result.data) {
        setChallengeText(result.data.challengeText);
        setChallengeId(result.data.challengeId);
        setHasGenerated(true);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to generate challenge text');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!challengeText) return;

    try {
      await navigator.clipboard.writeText(challengeText);
      setJustCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setJustCopied(false), 2000);
    } catch {
      toast.error('Failed to copy text');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">Challenge Argument</h2>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-gray">Saving...</span>}
          {challengeText && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-teal transition-colors hover:bg-teal/10"
            >
              <FontAwesomeIcon
                icon={justCopied ? faCheck : faCopy}
                className={justCopied ? 'text-success' : ''}
              />
              {justCopied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* Reason selector */}
      {!hasGenerated && (
        <div className="mt-4">
          <label
            htmlFor="challenge-reason"
            className="mb-1.5 block text-xs font-medium text-gray"
          >
            Challenge reason
          </label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="challenge-reason">
              <SelectValue placeholder="Select your grounds for challenge" />
            </SelectTrigger>
            <SelectContent>
              {reasonEntries.map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main textarea */}
      <div className="mt-4">
        {isGenerating ? (
          <div className="flex min-h-[140px] items-center justify-center rounded-md border border-input bg-light">
            <div className="flex flex-col items-center gap-2 text-gray">
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="animate-spin text-teal"
                size="lg"
              />
              <span className="text-sm">Generating your argument...</span>
            </div>
          </div>
        ) : (
          <Textarea
            value={challengeText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Your challenge argument will appear here after generating..."
            className="min-h-[140px] resize-y text-sm leading-relaxed"
            readOnly={!hasGenerated}
          />
        )}
      </div>

      {/* Additional information (collapsible) */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray transition-colors hover:text-dark"
        >
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`text-xs transition-transform ${showAdditionalInfo ? 'rotate-180' : ''}`}
          />
          Additional information
          <span className="text-xs font-normal">(optional)</span>
        </button>
        <AnimatePresence>
          {showAdditionalInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Textarea
                value={additionalInfo}
                onChange={(e) => {
                  setAdditionalInfo(e.target.value);
                  if (hasGenerated && challengeId) {
                    debouncedSave(challengeText, e.target.value);
                  }
                }}
                placeholder="E.g. 'I was loading disabled passengers', 'the meter was broken', 'I had a valid permit displayed'..."
                className="mt-2 min-h-[80px] resize-y text-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate / Regenerate button */}
      <div className="mt-4">
        {isPremium ? (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!reason && !hasGenerated)}
            className="w-full bg-teal text-white hover:bg-teal-dark"
          >
            {isGenerating && (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="mr-2 animate-spin"
                />
                Generating...
              </>
            )}
            {!isGenerating && hasGenerated && (
              <>
                <FontAwesomeIcon icon={faRotate} className="mr-2" />
                Regenerate
              </>
            )}
            {!isGenerating && !hasGenerated && (
              <>
                <FontAwesomeIcon icon={faWandMagicSparkles} className="mr-2" />
                Generate Argument
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={onUpgrade}
            className="w-full gap-2 bg-teal text-white hover:bg-teal-dark"
          >
            <FontAwesomeIcon icon={faLock} />
            Upgrade to Premium
          </Button>
        )}
      </div>

      {/* Secondary actions — visible after generation */}
      {hasGenerated && challengeText && (
        <div className="mt-4 flex items-center justify-center gap-4 border-t border-border pt-4">
          <p className="text-xs text-gray">Use this text:</p>
          {onSendLetter && (
            <button
              type="button"
              onClick={onSendLetter}
              className="text-sm font-medium text-teal transition-colors hover:text-teal-dark"
            >
              Send as Letter
            </button>
          )}
          {onSendLetter && onAutoChallenge && (
            <span className="text-xs text-gray">|</span>
          )}
          {onAutoChallenge && (
            <button
              type="button"
              onClick={onAutoChallenge}
              className="text-sm font-medium text-teal transition-colors hover:text-teal-dark"
            >
              Auto-Submit
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ChallengeArgumentCard;
