'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUnlock } from '@fortawesome/pro-solid-svg-icons';
import { TicketTier } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import ScoreGauge from '@/components/ui/ScoreGauge';

type SuccessPredictionCardProps = {
  tier: TicketTier;
  successPrediction: number;
  potentialSavings?: number;
  onUpgrade?: () => void;
};

const canViewSuccessScore = (tier: TicketTier) =>
  tier === TicketTier.STANDARD || tier === TicketTier.PREMIUM;

const SuccessPredictionCard = ({
  tier,
  successPrediction,
  potentialSavings,
  onUpgrade,
}: SuccessPredictionCardProps) => {
  const isLocked = !canViewSuccessScore(tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <h2 className="text-center text-lg font-semibold text-dark">
        Success Prediction
      </h2>
      <div className="mt-4 flex justify-center">
        <ScoreGauge
          score={successPrediction}
          size="lg"
          showLabel
          locked={isLocked}
          potentialSavings={potentialSavings}
          showSavings={!isLocked}
        />
      </div>
      {isLocked && onUpgrade && (
        <Button
          className="mt-4 w-full bg-teal text-white hover:bg-teal-dark"
          onClick={onUpgrade}
        >
          <FontAwesomeIcon icon={faUnlock} className="mr-2" />
          Upgrade to See Score
        </Button>
      )}
    </motion.div>
  );
};

export default SuccessPredictionCard;
