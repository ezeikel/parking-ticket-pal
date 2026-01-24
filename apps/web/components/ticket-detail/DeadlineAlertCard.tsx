'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/pro-solid-svg-icons';

type DeadlineAlertCardProps = {
  deadlineDays: number;
  discountDeadline: Date;
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const DeadlineAlertCard = ({
  deadlineDays,
  discountDeadline,
}: DeadlineAlertCardProps) => {
  // Only show if deadline is between 1 and 14 days
  if (deadlineDays <= 0 || deadlineDays > 14) {
    return null;
  }

  const isCritical = deadlineDays <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-xl border p-5 ${
        isCritical
          ? 'border-coral/30 bg-coral/5'
          : 'border-amber/30 bg-amber/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isCritical ? 'bg-coral/10' : 'bg-amber/10'
          }`}
        >
          <FontAwesomeIcon
            icon={faClock}
            className={`text-lg ${isCritical ? 'text-coral' : 'text-amber'}`}
          />
        </div>
        <div>
          <h3
            className={`font-semibold ${
              isCritical ? 'text-coral' : 'text-amber'
            }`}
          >
            {deadlineDays} {deadlineDays === 1 ? 'day' : 'days'} remaining
          </h3>
          <p className="mt-1 text-sm text-gray">
            Respond before {formatDate(discountDeadline)} to keep the 50%
            discount or challenge the ticket.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default DeadlineAlertCard;
