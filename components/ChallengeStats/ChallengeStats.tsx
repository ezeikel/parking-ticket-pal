import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPiggyBank, faShieldCheck } from '@fortawesome/pro-regular-svg-icons';
import { cn } from '@/lib/utils';
import { TicketTier } from '@prisma/client';

type ChallengeStatsProps = {
  successRate: number;
  potentialSavings: string;
  tier: TicketTier;
};

const ChallengeStats = ({
  successRate,
  potentialSavings,
  tier,
}: ChallengeStatsProps) => {
  const getSuccessRateColor = () => {
    if (successRate >= 70) return 'text-emerald-600';
    if (successRate >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const isLocked = tier === TicketTier.FREE;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4 sm:gap-6',
        isLocked && 'opacity-70',
      )}
    >
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-medium mb-1">
          Success Likelihood
        </p>
        <div className="flex items-center justify-center gap-2">
          <FontAwesomeIcon
            icon={faShieldCheck}
            className={cn('', getSuccessRateColor())}
            size="lg"
          />
          <span className={cn('text-2xl font-bold', getSuccessRateColor())}>
            {successRate}%
          </span>
        </div>
      </div>
      <div className="w-px h-10 bg-border" />
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-medium mb-1">
          Potential Savings
        </p>
        <div className="flex items-center justify-center gap-2">
          <FontAwesomeIcon
            icon={faPiggyBank}
            className="text-emerald-600"
            size="lg"
          />
          <span className="text-2xl font-bold text-emerald-600">
            {potentialSavings}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChallengeStats;
