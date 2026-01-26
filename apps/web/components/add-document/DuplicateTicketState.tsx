'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faCircleInfo,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type DuplicateTicketStateProps = {
  ticketId: string;
  pcnNumber: string;
  issuer?: string;
  onUploadDifferent: () => void;
};

const DuplicateTicketState = ({
  ticketId,
  pcnNumber,
  issuer,
  onUploadDifferent,
}: DuplicateTicketStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-8"
    >
      {/* Info Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber/10">
        <FontAwesomeIcon icon={faCircleInfo} className="text-4xl text-amber" />
      </div>

      {/* Message */}
      <div className="mt-6 text-center">
        <h2 className="text-xl font-bold text-dark">
          This ticket is already in your account
        </h2>
        <p className="mt-2 text-gray">
          We found an existing ticket with this PCN number
        </p>
      </div>

      {/* Ticket Info Card */}
      <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-light/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <FontAwesomeIcon icon={faTicket} className="text-teal" />
          </div>
          <div>
            <p className="font-semibold text-dark">{pcnNumber}</p>
            {issuer && <p className="text-sm text-gray">{issuer}</p>}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Button asChild className="h-12 bg-teal text-white hover:bg-teal-dark">
          <Link href={`/tickets/${ticketId}`}>
            View Ticket
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Link>
        </Button>

        <Button
          variant="outline"
          onClick={onUploadDifferent}
          className="h-12 border-border bg-transparent text-dark hover:bg-light"
        >
          Upload Different Document
        </Button>
      </div>
    </motion.div>
  );
};

export default DuplicateTicketState;
