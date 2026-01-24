'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faDownload,
  faRotate,
} from '@fortawesome/pro-solid-svg-icons';
import type { Letter, Media } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type LetterWithMedia = Pick<Letter, 'id' | 'sentAt' | 'summary' | 'type'> & {
  media: Media[];
};

type AppealLetterCardProps = {
  letters: LetterWithMedia[];
  onViewLetter?: (letter: LetterWithMedia) => void;
  onDownload?: (letter: LetterWithMedia) => void;
  onRegenerate?: () => void;
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const AppealLetterCard = ({
  letters,
  onViewLetter,
  onDownload,
  onRegenerate,
}: AppealLetterCardProps) => {
  if (letters.length === 0) {
    return null;
  }

  const latestLetter = letters[0];
  const letterPreview = latestLetter.summary || 'Appeal letter generated...';

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
          Generated {formatDate(latestLetter.sentAt)}
        </span>
      </div>

      <div className="relative mt-4 rounded-lg bg-light p-4">
        <p className="line-clamp-4 font-mono text-sm text-dark">
          {letterPreview}
        </p>
        <div className="absolute inset-x-0 bottom-0 h-12 rounded-b-lg bg-gradient-to-t from-light to-transparent" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onViewLetter && (
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => onViewLetter(latestLetter)}
          >
            <FontAwesomeIcon icon={faEye} className="mr-2" />
            View Full Letter
          </Button>
        )}
        {onDownload && latestLetter.media.length > 0 && (
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => onDownload(latestLetter)}
          >
            <FontAwesomeIcon icon={faDownload} className="mr-2" />
            Download PDF
          </Button>
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
      {letters.length > 1 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-gray">Previous versions</p>
          <div className="mt-2 space-y-2">
            {letters.slice(1).map((letter) => (
              <button
                key={letter.id}
                type="button"
                onClick={() => onViewLetter?.(letter)}
                className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm transition-colors hover:bg-light"
              >
                <span className="text-dark">
                  {letter.type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray">
                  {formatDate(letter.sentAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AppealLetterCard;
