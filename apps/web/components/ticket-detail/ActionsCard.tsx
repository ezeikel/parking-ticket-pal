'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faEye,
  faChartLine,
  faFileLines,
  faPen,
  faCreditCard,
  faTrash,
  faLock,
  faRobot,
} from '@fortawesome/pro-solid-svg-icons';
import { TicketStatus, TicketTier } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type ActionsCardProps = {
  status: TicketStatus;
  tier: TicketTier;
  hasLetter: boolean;
  deadlineDays?: number;
  onAutoChallenge?: () => void;
  onGenerateLetter?: () => void;
  onPreviewLetter?: () => void;
  onTrackStatus?: () => void;
  onViewSubmission?: () => void;
  onEdit?: () => void;
  onMarkAsPaid?: () => void;
  onDelete?: () => void;
  onUpgrade?: () => void;
};

const isNeedsAction = (status: TicketStatus) =>
  status === TicketStatus.ISSUED_DISCOUNT_PERIOD ||
  status === TicketStatus.ISSUED_FULL_CHARGE ||
  status === TicketStatus.NOTICE_TO_OWNER ||
  status === TicketStatus.NOTICE_TO_KEEPER;

const isSubmitted = (status: TicketStatus) =>
  status === TicketStatus.FORMAL_REPRESENTATION ||
  status === TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR ||
  status === TicketStatus.POPLA_APPEAL ||
  status === TicketStatus.IAS_APPEAL ||
  status === TicketStatus.APPEAL_TO_TRIBUNAL;

const ActionsCard = ({
  status,
  tier,
  hasLetter,
  deadlineDays,
  onAutoChallenge,
  onGenerateLetter,
  onPreviewLetter,
  onTrackStatus,
  onViewSubmission,
  onEdit,
  onMarkAsPaid,
  onDelete,
  onUpgrade,
}: ActionsCardProps) => {
  const needsAction = isNeedsAction(status);
  const submitted = isSubmitted(status);
  const isPremium = tier === TicketTier.PREMIUM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <h2 className="text-lg font-semibold text-dark">Actions</h2>

      <div className="mt-4 space-y-3">
        {/* Primary Actions - Conditional on status, tier, and letter existence */}
        {isPremium ? (
          // PREMIUM tier - show both challenge options
          needsAction ? (
            <>
              {/* Auto-Submit Challenge - primary action */}
              <Button
                className="w-full gap-2 bg-teal text-white hover:bg-teal-dark"
                onClick={onAutoChallenge}
              >
                <FontAwesomeIcon icon={faRobot} />
                Auto-Submit Challenge
              </Button>
              {/* Generate Letter - secondary option */}
              <Button
                variant="outline"
                className="w-full gap-2 bg-transparent"
                onClick={onGenerateLetter}
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                Generate Challenge Letter
              </Button>
              {/* Preview Letter if one exists */}
              {hasLetter && (
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  onClick={onPreviewLetter}
                >
                  <FontAwesomeIcon icon={faEye} />
                  Preview Letter
                </Button>
              )}
            </>
          ) : submitted ? (
            // Already submitted - show tracking options
            <>
              <Button
                className="w-full gap-2 bg-teal text-white hover:bg-teal-dark"
                onClick={onTrackStatus}
              >
                <FontAwesomeIcon icon={faChartLine} />
                Track Status
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 bg-transparent"
                onClick={onViewSubmission}
              >
                <FontAwesomeIcon icon={faFileLines} />
                View Submission
              </Button>
            </>
          ) : null
        ) : (
          // Not PREMIUM - show upgrade button
          <Button
            className="w-full gap-2 bg-teal text-white hover:bg-teal-dark"
            onClick={onUpgrade}
          >
            <FontAwesomeIcon icon={faLock} />
            Upgrade to Challenge Ticket
          </Button>
        )}

        {/* Days Remaining Alert - shown prominently in actions */}
        {deadlineDays !== undefined &&
          deadlineDays > 0 &&
          deadlineDays <= 14 && (
            <div
              className={`rounded-lg p-3 text-center text-sm font-medium ${
                deadlineDays <= 3
                  ? 'bg-coral/10 text-coral'
                  : 'bg-amber/10 text-amber-600'
              }`}
            >
              {deadlineDays} {deadlineDays === 1 ? 'day' : 'days'} remaining
            </div>
          )}

        {/* Secondary Actions */}
        <div className="border-t border-border pt-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray hover:text-dark"
            onClick={onEdit}
          >
            <FontAwesomeIcon icon={faPen} className="mr-2" />
            Edit Ticket
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray hover:text-dark"
            onClick={onMarkAsPaid}
          >
            <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
            Mark as Paid
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-coral hover:bg-coral/10 hover:text-coral"
            onClick={onDelete}
          >
            <FontAwesomeIcon icon={faTrash} className="mr-2" />
            Delete Ticket
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ActionsCard;
