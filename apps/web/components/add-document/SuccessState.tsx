'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faTicket,
  faPlus,
  faEnvelopeOpenText,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type DocumentType = 'ticket' | 'letter' | 'unknown';

type SuccessStateProps = {
  ticketId: string;
  pcnNumber: string;
  documentType?: DocumentType;
  onAddAnother: () => void;
};

const SuccessState = ({
  ticketId,
  pcnNumber,
  documentType = 'ticket',
  onAddAnother,
}: SuccessStateProps) => {
  const [countdown, setCountdown] = useState(5);

  const isLetter = documentType === 'letter';
  const successTitle = isLetter ? 'Letter Added!' : 'Ticket Added!';
  const successMessage = isLetter
    ? 'Your letter has been linked to the ticket.'
    : 'Your ticket has been saved.';
  const buttonText = isLetter ? 'View Ticket' : 'View Ticket';
  const addAnotherText = isLetter
    ? 'Add Another Document'
    : 'Add Another Ticket';
  const successIcon = isLetter ? faEnvelopeOpenText : faTicket;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = `/tickets/${ticketId}`;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ticketId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-12"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          damping: 15,
          stiffness: 200,
          delay: 0.1,
        }}
        className="relative"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal/10">
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="text-5xl text-teal"
          />
        </div>
        {/* Celebration particles */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2] }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute inset-0 rounded-full border-2 border-teal/30"
        />
      </motion.div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-center"
      >
        <h2 className="text-2xl font-bold text-dark">{successTitle}</h2>
        <p className="mt-2 text-gray">
          {successMessage}{' '}
          <span className="font-semibold text-dark">{pcnNumber}</span>
        </p>
      </motion.div>

      {/* Auto-redirect notice */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-sm text-gray"
      >
        Redirecting to your ticket in {countdown}s...
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex w-full max-w-xs flex-col gap-3"
      >
        <Button asChild className="h-12 bg-teal text-white hover:bg-teal-dark">
          <Link href={`/tickets/${ticketId}`}>
            <FontAwesomeIcon icon={successIcon} className="mr-2" />
            {buttonText}
          </Link>
        </Button>

        <Button
          variant="outline"
          onClick={onAddAnother}
          className="h-12 border-border bg-transparent text-dark hover:bg-light"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {addAnotherText}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default SuccessState;
