'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faArrowRight,
  faXmark,
  faCrown,
} from '@fortawesome/pro-solid-svg-icons';
import { TicketTier } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type PendingTicket = {
  id: string;
  pcnNumber: string;
  vehicleReg: string;
  tier: TicketTier;
  createdAt: Date;
};

type PendingTicketsBannerProps = {
  pendingTickets: PendingTicket[];
  className?: string;
};

const PendingTicketsBanner = ({
  pendingTickets,
  className = '',
}: PendingTicketsBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || pendingTickets.length === 0) {
    return null;
  }

  const ticketCount = pendingTickets.length;
  const firstTicket = pendingTickets[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative rounded-xl border border-amber/30 bg-amber/5 p-4 ${className}`}
      >
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray transition-colors hover:bg-gray/10 hover:text-dark"
          aria-label="Dismiss"
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/20">
            <FontAwesomeIcon icon={faTicket} className="text-amber" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark">
              {ticketCount === 1
                ? 'You have a ticket waiting to be claimed!'
                : `You have ${ticketCount} tickets waiting to be claimed!`}
            </h3>
            <p className="mt-1 text-sm text-gray">
              {ticketCount === 1 ? (
                <>
                  Ticket <span className="font-mono font-medium text-dark">{firstTicket.pcnNumber}</span> for{' '}
                  <span className="font-medium text-dark">{firstTicket.vehicleReg}</span> is ready.
                  {firstTicket.tier === TicketTier.PREMIUM && (
                    <span className="ml-1 inline-flex items-center gap-1 text-amber">
                      <FontAwesomeIcon icon={faCrown} className="text-xs" />
                      Premium
                    </span>
                  )}
                </>
              ) : (
                <>
                  You purchased {ticketCount} tickets before signing up. Claim them to add to your account.
                </>
              )}
            </p>
            <div className="mt-3">
              <Link href={`/guest/claim-pending${ticketCount === 1 ? `?id=${firstTicket.id}` : ''}`}>
                <Button
                  size="sm"
                  className="gap-2 bg-amber text-white hover:bg-amber/90"
                >
                  {ticketCount === 1 ? 'Claim Ticket' : 'Claim Tickets'}
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PendingTicketsBanner;
