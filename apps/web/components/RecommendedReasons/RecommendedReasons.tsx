'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleXmark,
  faLightbulb,
} from '@fortawesome/pro-solid-svg-icons';
import { cn } from '@/lib/utils';

type Pattern = { pattern: string; frequency: number };

type RecommendedReasonsProps = {
  winningPatterns: Pattern[];
  losingPatterns: Pattern[];
  totalCases: number;
  className?: string;
};

// Human-readable labels for patterns
const PATTERN_LABELS: Record<string, string> = {
  // Winning patterns
  SIGNAGE_INADEQUATE: 'Signs were unclear or not visible',
  CCTV_UNCLEAR: 'CCTV evidence was unclear',
  EVIDENCE_INSUFFICIENT: 'Authority evidence was insufficient',
  PROCEDURAL_ERROR: 'Council made procedural errors',
  TMO_INVALID: 'Traffic order was invalid',
  TIME_DISCREPANCY: 'Time on ticket was incorrect',
  NOTICE_NOT_SERVED: 'Notice was not properly served',
  LOADING_EXEMPTION: 'Was loading/unloading goods',
  PERMIT_WAS_VALID: 'Had a valid permit displayed',
  BLUE_BADGE_DISPLAYED: 'Blue badge was correctly displayed',
  VEHICLE_SOLD: 'Vehicle was sold before the contravention',
  VEHICLE_STOLEN: 'Vehicle was stolen',
  HIRE_VEHICLE: 'Vehicle was hired out',
  EMERGENCY_SITUATION: 'Emergency situation occurred',
  BREAKDOWN: 'Vehicle had broken down',

  // Losing patterns
  NO_EVIDENCE_PROVIDED: 'No supporting evidence provided',
  LATE_APPEAL: 'Appeal submitted too late',
  ADMITTED_CONTRAVENTION: 'Admitted the contravention occurred',
  MITIGATION_ONLY: 'Only offered mitigating circumstances',
  SIGNAGE_WAS_ADEQUATE: 'Signage was found to be adequate',
  CCTV_CLEAR: 'CCTV evidence was clear',
  NO_LOADING_ACTIVITY: 'No loading activity was observed',
  PERMIT_EXPIRED: 'Permit had expired',
  PERMIT_NOT_DISPLAYED: 'Permit was not displayed',
  PARKED_INCORRECTLY: 'Vehicle was parked incorrectly',
  EXCEEDED_TIME_LIMIT: 'Exceeded the time limit',
};

const MAX_PATTERNS = 3;

const RecommendedReasons = ({
  winningPatterns,
  losingPatterns,
  totalCases,
  className,
}: RecommendedReasonsProps) => {
  // Don't show if we have no data
  if (totalCases === 0 || (winningPatterns.length === 0 && losingPatterns.length === 0)) {
    return null;
  }

  // Limit to top patterns to keep UI compact
  const topWinning = winningPatterns.slice(0, MAX_PATTERNS);
  const topLosing = losingPatterns.slice(0, MAX_PATTERNS);

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-3 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FontAwesomeIcon icon={faLightbulb} className="text-amber-500" />
        <span>
          Based on{' '}
          <span className="font-medium text-foreground">
            {totalCases.toLocaleString()}
          </span>{' '}
          similar tribunal cases
        </span>
      </div>

      {topWinning.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-500 mb-2">
            <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
            <span>Reasons that succeeded</span>
          </div>
          <ul className="space-y-1 ml-5">
            {topWinning.map((p) => (
              <li
                key={p.pattern}
                className="text-sm text-foreground flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{PATTERN_LABELS[p.pattern] ?? p.pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topLosing.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-500 mb-2">
            <FontAwesomeIcon icon={faCircleXmark} className="text-xs" />
            <span>Reasons to avoid</span>
          </div>
          <ul className="space-y-1 ml-5">
            {topLosing.map((p) => (
              <li
                key={p.pattern}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span>{PATTERN_LABELS[p.pattern] ?? p.pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RecommendedReasons;
