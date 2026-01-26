'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faDownload,
  faRotate,
  faFileLines,
} from '@fortawesome/pro-solid-svg-icons';
import type { Letter, Media } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type LetterWithMedia = Pick<Letter, 'id' | 'sentAt' | 'summary' | 'type'> & {
  media: Media[];
};

type AppealLetterSummaryCardProps = {
  letter: LetterWithMedia;
  onViewLetter?: () => void;
  onDownload?: () => void;
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

const formatTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AppealLetterSummaryCard = ({
  letter,
  onViewLetter,
  onDownload,
  onRegenerate,
}: AppealLetterSummaryCardProps) => {
  const letterPreview =
    letter.summary ||
    'Your appeal letter has been generated and is ready for review...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
          <FontAwesomeIcon icon={faFileLines} className="text-teal" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-dark">
            Your Appeal Letter
          </h2>
          <p className="text-xs text-gray">
            Generated {formatDate(letter.sentAt)} at {formatTime(letter.sentAt)}
          </p>
        </div>
      </div>

      {/* Preview snippet */}
      <div className="relative mt-4 rounded-lg bg-light p-4">
        <p className="line-clamp-3 text-sm text-dark">{letterPreview}</p>
        <div className="absolute inset-x-0 bottom-0 h-8 rounded-b-lg bg-gradient-to-t from-light to-transparent" />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {onViewLetter && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 bg-transparent"
            onClick={onViewLetter}
          >
            <FontAwesomeIcon icon={faEye} />
            View Full Letter
          </Button>
        )}
        {onDownload && letter.media.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 bg-transparent"
            onClick={onDownload}
          >
            <FontAwesomeIcon icon={faDownload} />
            Download PDF
          </Button>
        )}
      </div>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-gray hover:text-dark"
          onClick={onRegenerate}
        >
          <FontAwesomeIcon icon={faRotate} className="mr-1.5" />
          Regenerate
        </Button>
      )}
    </motion.div>
  );
};

export default AppealLetterSummaryCard;
