'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Address } from '@parking-ticket-pal/types';

type TicketInfoCardProps = {
  pcnNumber: string;
  issuedAt: Date;
  contraventionCode: string | null;
  location: Address | null;
  vehicleReg: string;
  issuer: string;
  originalAmount: number;
  currentAmount: number;
  discountDeadline?: Date | null;
  finalDeadline?: Date | null;
  onEdit?: () => void;
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TicketInfoCard = ({
  pcnNumber,
  issuedAt,
  contraventionCode,
  location,
  vehicleReg,
  issuer,
  originalAmount,
  currentAmount,
  discountDeadline,
  finalDeadline,
  onEdit,
}: TicketInfoCardProps) => {
  const locationDisplay = location?.line1 || 'Unknown location';
  const isDiscounted = currentAmount < originalAmount;
  const isOverdue = currentAmount > originalAmount;

  // Calculate discount deadline (14 days from issue)
  const computedDiscountDeadline =
    discountDeadline || new Date(new Date(issuedAt).getTime() + 14 * 24 * 60 * 60 * 1000);

  // Calculate final deadline (28 days from issue)
  const computedFinalDeadline =
    finalDeadline || new Date(new Date(issuedAt).getTime() + 28 * 24 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">Ticket Details</h2>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray hover:text-dark"
            onClick={onEdit}
          >
            <FontAwesomeIcon icon={faPen} className="mr-1.5" />
            Edit
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-gray">PCN Reference</p>
          <p className="mt-0.5 font-semibold text-dark">{pcnNumber}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray">Issue Date</p>
          <p className="mt-0.5 font-semibold text-dark">{formatDate(issuedAt)}</p>
        </div>

        {contraventionCode && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-gray">Contravention</p>
            <p className="mt-0.5 text-dark">
              <span className="font-semibold">Code {contraventionCode}</span>
            </p>
          </div>
        )}

        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-gray">Location</p>
          <p className="mt-0.5 font-semibold text-dark">{locationDisplay}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray">Vehicle Registration</p>
          <p className="mt-0.5 font-plate font-bold text-dark">{vehicleReg}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray">Issuer</p>
          <p className="mt-0.5 font-semibold text-dark">{issuer}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray">Original Amount</p>
          <p className="mt-0.5 font-semibold text-dark">
            {formatAmount(originalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray">Current Amount</p>
          <p
            className={`mt-0.5 font-semibold ${
              isOverdue ? 'text-coral' : 'text-dark'
            }`}
          >
            {formatAmount(currentAmount)}
            {isDiscounted && (
              <span className="ml-1 text-xs font-normal text-success">
                (50% discount)
              </span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray">Discount Deadline</p>
          <p className="mt-0.5 font-semibold text-dark">
            {formatDate(computedDiscountDeadline)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray">Final Deadline</p>
          <p className="mt-0.5 font-semibold text-dark">
            {formatDate(computedFinalDeadline)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default TicketInfoCard;
