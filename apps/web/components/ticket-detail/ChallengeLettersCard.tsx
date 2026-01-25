'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faDownload, faRotate } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

type ChallengeMetadata = {
  pdfUrl?: string;
  pdfGenerated?: boolean;
  emailSent?: boolean;
  letterContent?: string;
};

type ChallengeWithMetadata = {
  id: string;
  reason: string;
  status: string;
  createdAt: Date;
  metadata?: ChallengeMetadata | null | unknown;
};

type ChallengeLettersCardProps = {
  challenges: ChallengeWithMetadata[];
  onRegenerate?: () => void;
};

// Helper to safely parse metadata
const parseMetadata = (metadata: unknown): ChallengeMetadata | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  return {
    pdfUrl: typeof m.pdfUrl === 'string' ? m.pdfUrl : undefined,
    pdfGenerated: typeof m.pdfGenerated === 'boolean' ? m.pdfGenerated : undefined,
    emailSent: typeof m.emailSent === 'boolean' ? m.emailSent : undefined,
    letterContent: typeof m.letterContent === 'string' ? m.letterContent : undefined,
  };
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatReason = (reason: string): string => {
  const reasonLabels: Record<string, string> = {
    VEHICLE_STOLEN: 'vehicle theft',
    NOT_VEHICLE_OWNER: 'not being the vehicle owner',
    ALREADY_PAID: 'the ticket already being paid',
    INVALID_TMO: 'an invalid Traffic Management Order',
    HIRE_FIRM: 'the vehicle being hired out',
    SIGNAGE_ISSUE: 'inadequate signage',
    MITIGATING_CIRCUMSTANCES: 'mitigating circumstances',
    PROCEDURAL_ERROR: 'procedural errors',
    OTHER: 'other grounds',
  };
  return reasonLabels[reason] || reason.replace(/_/g, ' ').toLowerCase();
};

const ChallengeLettersCard = ({ challenges, onRegenerate }: ChallengeLettersCardProps) => {
  // Parse metadata and filter to only show challenges with PDFs
  const letterChallenges = challenges
    .map((c) => ({
      ...c,
      parsedMetadata: parseMetadata(c.metadata),
    }))
    .filter((c) => c.parsedMetadata?.pdfGenerated && c.parsedMetadata?.pdfUrl);

  if (letterChallenges.length === 0) {
    return null;
  }

  const latestLetter = letterChallenges[0];
  const latestMetadata = latestLetter.parsedMetadata!;
  const reasonText = formatReason(latestLetter.reason);

  // Generate a preview of what the letter might say
  const letterPreview = latestMetadata.letterContent ||
    `Dear Sir/Madam,\n\nI am writing to formally challenge the above Penalty Charge Notice on the grounds of ${reasonText}.\n\nI respectfully request that you cancel this PCN and I would be grateful for your consideration of the circumstances outlined...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">Your Appeal Letter</h2>
        <span className="text-xs text-gray">
          Generated {formatDate(latestLetter.createdAt)}
        </span>
      </div>

      <div className="relative mt-4 rounded-lg bg-light p-4">
        <p className="line-clamp-4 whitespace-pre-line font-mono text-sm text-dark">
          {letterPreview}
        </p>
        <div className="absolute inset-x-0 bottom-0 h-12 rounded-b-lg bg-gradient-to-t from-light to-transparent" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {latestMetadata.pdfUrl && (
          <>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => window.open(latestMetadata.pdfUrl, '_blank')}
            >
              <FontAwesomeIcon icon={faEye} className="mr-2" />
              View Full Letter
            </Button>
            <Button
              variant="outline"
              className="bg-transparent"
              asChild
            >
              <a href={latestMetadata.pdfUrl} download>
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Download PDF
              </a>
            </Button>
          </>
        )}
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray hover:text-dark"
            onClick={onRegenerate}
          >
            <FontAwesomeIcon icon={faRotate} className="mr-1.5" />
            Regenerate
          </Button>
        )}
      </div>

      {/* Show history if multiple letters */}
      {letterChallenges.length > 1 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-gray">Previous versions ({letterChallenges.length - 1})</p>
          <div className="mt-2 space-y-2">
            {letterChallenges.slice(1, 4).map((letter) => (
              <button
                key={letter.id}
                type="button"
                onClick={() => letter.parsedMetadata?.pdfUrl && window.open(letter.parsedMetadata.pdfUrl, '_blank')}
                className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm transition-colors hover:bg-light"
              >
                <span className="capitalize text-dark">
                  {formatReason(letter.reason)}
                </span>
                <span className="text-xs text-gray">
                  {formatDate(letter.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChallengeLettersCard;
