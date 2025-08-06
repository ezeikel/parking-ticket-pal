import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPiggyBank,
  faShieldCheck,
  faLock,
} from '@fortawesome/pro-regular-svg-icons';
import { cn } from '@/lib/utils';
import { TicketTier } from '@prisma/client';
import { Button } from '@/components/ui/button';

type ChallengeStatsProps = {
  successRate: number;
  potentialSavings: string;
  tier: TicketTier;
  onUnlock: () => void;
};

const ChallengeStats = ({
  successRate,
  potentialSavings,
  tier,
  onUnlock,
}: ChallengeStatsProps) => {
  const getSuccessRateColor = () => {
    if (successRate >= 70) return 'text-emerald-600';
    if (successRate >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const isLocked = tier === TicketTier.FREE;

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <div className="text-center">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">
            Success Likelihood
          </p>
          <div className="relative">
            <div
              className={cn('flex items-center justify-center gap-2 h-8', {
                'blur-[2.25px] select-none pointer-events-none': isLocked,
              })}
            >
              {isLocked ? (
                <>
                  <FontAwesomeIcon
                    icon={faShieldCheck}
                    className="text-amber-600"
                    size="lg"
                  />
                  <div className="">
                    <span className="text-2xl font-bold text-amber-600">
                      88%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={faShieldCheck}
                    className={cn(getSuccessRateColor())}
                    size="lg"
                  />
                  <span
                    className={cn('text-2xl font-bold', getSuccessRateColor())}
                  >
                    {Math.round(successRate)}%
                  </span>
                </>
              )}
            </div>
            {isLocked ? (
              // overlay with lock and unlock button
              <div className="absolute top-2 inset-0 bg-background/20 dark:bg-gray-900/20 rounded-lg flex flex-col items-center justify-center">
                <FontAwesomeIcon
                  icon={faLock}
                  className="text-primary mb-1"
                  size="lg"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 px-2 text-xs cursor-pointer"
                  onClick={onUnlock}
                >
                  Unlock
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="w-px h-12 bg-border" />
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-medium mb-1">
          Potential Savings
        </p>
        <div className="flex items-center justify-center gap-2 h-8">
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
