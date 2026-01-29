'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faEnvelope,
  faDownload,
  faExpand,
} from '@fortawesome/pro-solid-svg-icons';
import { LetterType, Media } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type LetterWithMedia = {
  id: string;
  type: LetterType;
  sentAt: Date;
  summary: string | null;
  extractedText: string | null;
  media: Pick<Media, 'id' | 'url'>[];
};

type LetterContentModalProps = {
  letter: LetterWithMedia | null;
  onClose: () => void;
  onViewImage?: (imageUrl: string) => void;
};

const letterTypeLabels: Record<LetterType, string> = {
  [LetterType.INITIAL_NOTICE]: 'Initial Notice',
  [LetterType.NOTICE_TO_OWNER]: 'Notice to Owner (NTO)',
  [LetterType.CHARGE_CERTIFICATE]: 'Charge Certificate',
  [LetterType.ORDER_FOR_RECOVERY]: 'Order for Recovery',
  [LetterType.CCJ_NOTICE]: 'County Court Judgment (CCJ)',
  [LetterType.FINAL_DEMAND]: 'Final Demand',
  [LetterType.BAILIFF_NOTICE]: 'Bailiff Notice',
  [LetterType.APPEAL_RESPONSE]: 'Appeal Response',
  [LetterType.GENERIC]: 'Other Letter',
  [LetterType.CHALLENGE_LETTER]: 'Challenge Letter',
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const LetterContentModal = ({
  letter,
  onClose,
  onViewImage,
}: LetterContentModalProps) => {
  return (
    <AnimatePresence>
      {letter && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark/90 p-4"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="text-lg text-teal"
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-dark">
                    {letterTypeLabels[letter.type] || letter.type}
                  </h2>
                  <p className="text-sm text-gray">
                    Received {formatDate(letter.sentAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Image thumbnail if available */}
              {letter.media.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-gray">
                    Original Image
                  </p>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => onViewImage?.(letter.media[0].url)}
                      className="group relative overflow-hidden rounded-lg"
                    >
                      <img
                        src={letter.media[0].url}
                        alt="Letter"
                        className="h-32 w-auto rounded-lg border object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-dark/0 transition-colors group-hover:bg-dark/40">
                        <FontAwesomeIcon
                          icon={faExpand}
                          className="text-lg text-white opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Summary if available */}
              {letter.summary && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-gray">Summary</p>
                  <p className="text-dark">{letter.summary}</p>
                </div>
              )}

              {/* Extracted text */}
              {letter.extractedText ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray">
                    Extracted Content
                  </p>
                  <div className="rounded-lg bg-light p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-dark">
                      {letter.extractedText}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-light/50 p-6 text-center">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="mb-2 text-2xl text-gray/40"
                  />
                  <p className="text-sm text-gray">
                    No text content was extracted from this letter.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              {letter.media.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => onViewImage?.(letter.media[0].url)}
                  >
                    <FontAwesomeIcon icon={faExpand} className="mr-2" />
                    View Full Image
                  </Button>
                  <Button variant="outline" className="bg-transparent" asChild>
                    <a href={letter.media[0].url} download>
                      <FontAwesomeIcon icon={faDownload} className="mr-2" />
                      Download Image
                    </a>
                  </Button>
                </>
              )}
              <Button onClick={onClose}>Close</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LetterContentModal;
