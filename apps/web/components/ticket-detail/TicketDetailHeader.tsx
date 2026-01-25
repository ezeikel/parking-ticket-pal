'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPen, faBolt } from '@fortawesome/pro-solid-svg-icons';
import { TicketStatus } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type TicketDetailHeaderProps = {
  pcnNumber: string;
  status: TicketStatus;
  issuer: string;
  onEdit?: () => void;
  onChallenge?: () => void;
};

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; icon: string }
> = {
  ISSUED_DISCOUNT_PERIOD: {
    label: 'Needs Action',
    bg: 'bg-amber/10',
    text: 'text-amber',
    icon: 'fa-circle-exclamation',
  },
  ISSUED_FULL_CHARGE: {
    label: 'Needs Action',
    bg: 'bg-amber/10',
    text: 'text-amber',
    icon: 'fa-circle-exclamation',
  },
  NOTICE_TO_OWNER: {
    label: 'NTO Received',
    bg: 'bg-amber/10',
    text: 'text-amber',
    icon: 'fa-envelope',
  },
  NOTICE_TO_KEEPER: {
    label: 'NTK Received',
    bg: 'bg-amber/10',
    text: 'text-amber',
    icon: 'fa-envelope',
  },
  FORMAL_REPRESENTATION: {
    label: 'Pending Appeal',
    bg: 'bg-teal/10',
    text: 'text-teal',
    icon: 'fa-hourglass-half',
  },
  APPEAL_SUBMITTED_TO_OPERATOR: {
    label: 'Appeal Submitted',
    bg: 'bg-teal/10',
    text: 'text-teal',
    icon: 'fa-paper-plane',
  },
  POPLA_APPEAL: {
    label: 'POPLA Appeal',
    bg: 'bg-teal/10',
    text: 'text-teal',
    icon: 'fa-scale-balanced',
  },
  IAS_APPEAL: {
    label: 'IAS Appeal',
    bg: 'bg-teal/10',
    text: 'text-teal',
    icon: 'fa-scale-balanced',
  },
  APPEAL_TO_TRIBUNAL: {
    label: 'Tribunal Appeal',
    bg: 'bg-teal/10',
    text: 'text-teal',
    icon: 'fa-gavel',
  },
  REPRESENTATION_ACCEPTED: {
    label: 'Won',
    bg: 'bg-success/10',
    text: 'text-success',
    icon: 'fa-circle-check',
  },
  APPEAL_UPHELD: {
    label: 'Won',
    bg: 'bg-success/10',
    text: 'text-success',
    icon: 'fa-circle-check',
  },
  NOTICE_OF_REJECTION: {
    label: 'Rejected',
    bg: 'bg-coral/10',
    text: 'text-coral',
    icon: 'fa-circle-xmark',
  },
  APPEAL_REJECTED_BY_OPERATOR: {
    label: 'Rejected',
    bg: 'bg-coral/10',
    text: 'text-coral',
    icon: 'fa-circle-xmark',
  },
  APPEAL_REJECTED: {
    label: 'Lost',
    bg: 'bg-coral/10',
    text: 'text-coral',
    icon: 'fa-circle-xmark',
  },
  CHARGE_CERTIFICATE: {
    label: 'Overdue',
    bg: 'bg-coral/10',
    text: 'text-coral',
    icon: 'fa-triangle-exclamation',
  },
  ORDER_FOR_RECOVERY: {
    label: 'Recovery',
    bg: 'bg-coral/10',
    text: 'text-coral',
    icon: 'fa-triangle-exclamation',
  },
  ENFORCEMENT_BAILIFF_STAGE: {
    label: 'Enforcement',
    bg: 'bg-coral/10',
    text: 'text-coral',
    icon: 'fa-user-shield',
  },
  DEBT_COLLECTION: {
    label: 'Debt Collection',
    bg: 'bg-gray/10',
    text: 'text-gray',
    icon: 'fa-file-invoice-dollar',
  },
  PAID: {
    label: 'Paid',
    bg: 'bg-light',
    text: 'text-gray',
    icon: 'fa-credit-card',
  },
};

const TicketDetailHeader = ({
  pcnNumber,
  status,
  issuer,
  onEdit,
  onChallenge,
}: TicketDetailHeaderProps) => {
  const statusStyle = statusConfig[status] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-gray/10',
    text: 'text-gray',
    icon: 'fa-circle-question',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-sm text-gray transition-colors hover:text-dark"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to Tickets
      </Link>

      <div className="mt-4">
        {/* Title row with PCN number */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-dark md:text-3xl">
            {pcnNumber}
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}
          >
            <i className={`fa-solid ${statusStyle.icon} text-xs`} />
            {statusStyle.label}
          </span>
        </div>

        {/* Issuer */}
        <p className="mt-1 text-gray">{issuer}</p>

        {/* Mobile Actions - separate row */}
        <div className="mt-3 flex gap-2 md:hidden">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent"
              onClick={onEdit}
            >
              <FontAwesomeIcon icon={faPen} />
            </Button>
          )}
          {onChallenge && (
            <Button
              size="sm"
              className="bg-teal text-white hover:bg-teal-dark"
              onClick={onChallenge}
            >
              <FontAwesomeIcon icon={faBolt} className="mr-1" />
              Challenge
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TicketDetailHeader;
