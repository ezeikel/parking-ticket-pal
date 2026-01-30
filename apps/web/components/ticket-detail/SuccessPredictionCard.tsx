'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUnlock, faInfoCircle } from '@fortawesome/pro-solid-svg-icons';
import { TicketTier } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import ScoreGauge from '@/components/ui/ScoreGauge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type PredictionMetadata = {
  dataSource: string;
  statsLevel: 'issuer_contravention' | 'contravention' | 'baseline';
  numberOfCases?: number;
};

type SuccessPredictionCardProps = {
  tier: TicketTier;
  successPrediction: number;
  potentialSavings?: number;
  onUpgrade?: () => void;
  numberOfCases?: number;
  metadata?: PredictionMetadata | null;
  issuerName?: string;
  contraventionCode?: string | null;
};

const canViewSuccessScore = (tier: TicketTier) =>
  tier === TicketTier.STANDARD || tier === TicketTier.PREMIUM;

/**
 * Generate explanation text based on the stats level and available data
 */
function getExplanationText(
  statsLevel: PredictionMetadata['statsLevel'] | undefined,
  numberOfCases: number | undefined,
  issuerName: string | undefined,
  contraventionCode: string | null | undefined
): { text: string; tooltip?: string } {
  if (!statsLevel || statsLevel === 'baseline') {
    return {
      text: 'Based on overall appeal success rates.',
      tooltip:
        'We don\'t have enough data for this specific contravention yet. As we add more tribunal data, this prediction will become more accurate.',
    };
  }

  const caseCount = numberOfCases?.toLocaleString() ?? '0';

  if (statsLevel === 'issuer_contravention' && issuerName) {
    return {
      text: `Based on ${caseCount} similar cases with ${issuerName}${contraventionCode ? ` for Code ${contraventionCode}` : ''}.`,
    };
  }

  if (statsLevel === 'contravention') {
    return {
      text: `Based on ${caseCount} cases for ${contraventionCode ? `Code ${contraventionCode}` : 'this contravention'} across all councils.`,
    };
  }

  return { text: '' };
}

const SuccessPredictionCard = ({
  tier,
  successPrediction,
  potentialSavings,
  onUpgrade,
  numberOfCases,
  metadata,
  issuerName,
  contraventionCode,
}: SuccessPredictionCardProps) => {
  const isLocked = !canViewSuccessScore(tier);

  const explanation = getExplanationText(
    metadata?.statsLevel,
    numberOfCases ?? metadata?.numberOfCases,
    issuerName,
    contraventionCode
  );

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

      {/* Explanation text - only show when unlocked and we have explanation */}
      {!isLocked && explanation.text && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-center">
          <p className="text-xs text-muted-foreground">{explanation.text}</p>
          {explanation.tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    aria-label="More information"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} className="text-xs" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  <p className="text-xs">{explanation.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

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
