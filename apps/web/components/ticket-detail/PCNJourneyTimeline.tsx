'use client';

import { motion } from 'framer-motion';
import { TicketStatus, IssuerType } from '@parking-ticket-pal/db/types';
import TicketStatusTimeline from '@/components/TicketStatusTimeline/TicketStatusTimeline';

type PCNJourneyTimelineProps = {
  currentStatus: TicketStatus;
  issuerType: IssuerType;
  onStatusChange: (newStatus: TicketStatus) => void;
};

const PCNJourneyTimeline = ({
  currentStatus,
  issuerType,
  onStatusChange,
}: PCNJourneyTimelineProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <h2 className="mb-4 text-lg font-semibold text-dark">Ticket Journey</h2>
      <p className="mb-4 text-sm text-gray">
        Track where you are in the PCN process. Click a stage for details.
      </p>
      <TicketStatusTimeline
        currentStatus={currentStatus}
        issuerType={issuerType}
        onStatusChange={onStatusChange}
      />
    </motion.div>
  );
};

export default PCNJourneyTimeline;
