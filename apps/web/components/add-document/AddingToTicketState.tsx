'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faEnvelopeOpenText,
  faArrowRight,
  faLink,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type AddingToTicketStateProps = {
  ticketId: string;
  pcnNumber: string;
  issuer?: string;
  onConfirm: () => void;
  onUploadDifferent: () => void;
  isProcessing?: boolean;
};

const AddingToTicketState = ({
  ticketId,
  pcnNumber,
  issuer,
  onConfirm,
  onUploadDifferent,
  isProcessing = false,
}: AddingToTicketStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-8"
    >
      {/* Link Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
        <FontAwesomeIcon icon={faLink} className="text-4xl text-teal" />
      </div>

      {/* Message */}
      <div className="mt-6 text-center">
        <h2 className="text-xl font-bold text-dark">
          Add letter to existing ticket?
        </h2>
        <p className="mt-2 text-gray">
          We found a matching ticket for this letter
        </p>
      </div>

      {/* Ticket Info Card */}
      <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-light/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <FontAwesomeIcon icon={faTicket} className="text-teal" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-dark">{pcnNumber}</p>
            {issuer && <p className="text-sm text-gray">{issuer}</p>}
          </div>
          <Link
            href={`/tickets/${ticketId}`}
            className="text-sm text-teal hover:underline"
          >
            View
          </Link>
        </div>
      </div>

      {/* Visual Connection */}
      <div className="my-4 flex flex-col items-center gap-1">
        <div className="h-4 w-0.5 bg-border" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-light">
          <FontAwesomeIcon
            icon={faEnvelopeOpenText}
            className="text-sm text-gray"
          />
        </div>
        <div className="h-4 w-0.5 bg-border" />
      </div>

      {/* Letter Preview */}
      <div className="w-full max-w-sm rounded-xl border border-dashed border-border bg-white/50 p-4">
        <p className="text-center text-sm text-gray">
          Your letter will be linked to this ticket
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="h-12 bg-teal text-white hover:bg-teal-dark"
        >
          {isProcessing ? (
            'Adding...'
          ) : (
            <>
              Add to Ticket
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onUploadDifferent}
          disabled={isProcessing}
          className="h-12 border-border bg-transparent text-dark hover:bg-light"
        >
          Upload Different Document
        </Button>
      </div>
    </motion.div>
  );
};

export default AddingToTicketState;
