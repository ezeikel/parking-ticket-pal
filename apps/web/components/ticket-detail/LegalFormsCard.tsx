'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines, faLock, faCrown } from '@fortawesome/pro-solid-svg-icons';
import { TicketTier } from '@parking-ticket-pal/db/types';
import { TicketWithRelations } from '@/types';
import { Button } from '@/components/ui/button';
import AdvancedForms from '@/components/AdvancedForms/AdvancedForms';

type LegalFormsCardProps = {
  ticket: TicketWithRelations;
  hasSignature: boolean;
  onUpgrade: () => void;
};

const LegalFormsCard = ({
  ticket,
  hasSignature,
  onUpgrade,
}: LegalFormsCardProps) => {
  const isPremium = ticket.tier === TicketTier.PREMIUM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {isPremium ? (
        <AdvancedForms ticket={ticket} hasSignature={hasSignature} />
      ) : (
        <div className="rounded-xl border border-border bg-white p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-light">
              <FontAwesomeIcon
                icon={faFileLines}
                className="text-lg text-dark"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark">Legal Forms</h2>
              <p className="text-sm text-gray">
                Pre-filled forms for later-stage appeals
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {['PE2', 'PE3', 'TE7', 'TE9', 'N244'].map((form) => (
              <span
                key={form}
                className="inline-flex items-center rounded-full bg-light px-3 py-1 text-xs font-medium text-dark"
              >
                {form}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faLock}
                className="text-sm text-amber-600"
              />
              <span className="text-sm font-medium text-amber-800">
                Premium Feature
              </span>
              <FontAwesomeIcon
                icon={faCrown}
                className="text-xs text-amber-500"
              />
            </div>
            <p className="mt-2 text-sm text-amber-700">
              Upgrade to Premium to generate pre-filled legal forms with your
              details and AI-polished text, ready to sign and submit.
            </p>
            <Button onClick={onUpgrade} className="mt-3" size="sm">
              Upgrade to Premium
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LegalFormsCard;
