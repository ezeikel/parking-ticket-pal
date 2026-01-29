'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinnerThird,
  faCheck,
  faXmark,
  faCircle,
  faRotate,
  faImages,
  faBan,
  faRobot,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import {
  useChallengeStatus,
  type ChallengeProgress,
} from '@/hooks/useChallengeStatus';
import { ChallengeStatus } from '@parking-ticket-pal/db';

type AutoChallengeStatusCardProps = {
  challengeId: string;
  initialStatus?: ChallengeStatus;
  reason?: string;
  createdAt?: Date;
  onRetry?: () => void;
  onViewScreenshots?: (urls: string[]) => void;
};

/**
 * Progress steps and their display info
 */
const PROGRESS_STEPS = [
  { step: 'opening_portal', label: 'Opening council portal' },
  { step: 'entering_pcn', label: 'Entering PCN details' },
  { step: 'submitting_lookup', label: 'Looking up ticket' },
  { step: 'loading_details', label: 'Loading ticket details' },
  { step: 'navigating_challenge', label: 'Going to challenge form' },
  { step: 'filling_form', label: 'Filling challenge form' },
  { step: 'submitting_challenge', label: 'Submitting challenge' },
  { step: 'capturing_confirmation', label: 'Capturing confirmation' },
];

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTimeAgo = (date: Date | string) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return formatDate(date);
};

const formatReason = (reason: string): string => {
  const reasonLabels: Record<string, string> = {
    VEHICLE_STOLEN: 'Vehicle theft',
    NOT_VEHICLE_OWNER: 'Not the vehicle owner',
    ALREADY_PAID: 'Already paid',
    INVALID_TMO: 'Invalid Traffic Management Order',
    HIRE_FIRM: 'Vehicle was hired out',
    SIGNAGE_ISSUE: 'Signage issue',
    MITIGATING_CIRCUMSTANCES: 'Mitigating circumstances',
    PROCEDURAL_ERROR: 'Procedural error',
    OTHER: 'Other',
  };
  return reasonLabels[reason] || reason.replace(/_/g, ' ');
};

/**
 * Progress indicator showing steps
 */
function ProgressSteps({ progress }: { progress?: ChallengeProgress }) {
  const currentStepIndex = progress
    ? PROGRESS_STEPS.findIndex((s) => s.step === progress.step)
    : -1;

  return (
    <div className="space-y-2 mt-4">
      {PROGRESS_STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <div key={step.step} className="flex items-center gap-3 text-sm">
            <div className="w-5 flex-shrink-0">
              {isCompleted && (
                <FontAwesomeIcon
                  icon={faCheck}
                  className="text-emerald-500"
                  size="sm"
                />
              )}
              {isCurrent && (
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="text-teal-500 animate-spin"
                  size="sm"
                />
              )}
              {isPending && (
                <FontAwesomeIcon
                  icon={faCircle}
                  className="text-gray-300"
                  size="xs"
                />
              )}
            </div>
            <span
              className={
                isCompleted
                  ? 'text-gray-600'
                  : isCurrent
                    ? 'text-teal-700 font-medium'
                    : 'text-gray-400'
              }
            >
              {step.label}
              {isCurrent && progress?.message && (
                <span className="text-gray-500 ml-1">- {progress.message}</span>
              )}
            </span>
          </div>
        );
      })}

      {/* Progress bar */}
      {progress && (
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.stepNumber / progress.totalSteps) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Step {progress.stepNumber} of {progress.totalSteps}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: ChallengeStatus | string }) {
  const config: Record<
    string,
    { icon: typeof faCheck; color: string; label: string }
  > = {
    IN_PROGRESS: {
      icon: faSpinnerThird,
      color: 'text-teal-600 bg-teal-50',
      label: 'In Progress',
    },
    SUCCESS: {
      icon: faCheck,
      color: 'text-emerald-600 bg-emerald-50',
      label: 'Submitted',
    },
    ERROR: {
      icon: faXmark,
      color: 'text-red-600 bg-red-50',
      label: 'Failed',
    },
    TIMEOUT: {
      icon: faXmark,
      color: 'text-amber-600 bg-amber-50',
      label: 'Timed Out',
    },
    CANCELLED: {
      icon: faBan,
      color: 'text-gray-600 bg-gray-100',
      label: 'Cancelled',
    },
    PENDING: {
      icon: faCircle,
      color: 'text-gray-600 bg-gray-100',
      label: 'Pending',
    },
  };

  const { icon, color, label } = config[status] || config.PENDING;
  const isSpinning = status === 'IN_PROGRESS';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${color}`}
    >
      <FontAwesomeIcon
        icon={icon}
        size="sm"
        className={isSpinning ? 'animate-spin' : ''}
      />
      {label}
    </span>
  );
}

export default function AutoChallengeStatusCard({
  challengeId,
  initialStatus,
  reason,
  createdAt,
  onRetry,
  onViewScreenshots,
}: AutoChallengeStatusCardProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  // Only poll if the challenge is in progress
  const shouldPoll = initialStatus === 'IN_PROGRESS';

  const { status: polledStatus, cancel } = useChallengeStatus(
    shouldPoll ? challengeId : null,
  );

  // Use polled status if available, otherwise use initial
  const currentStatus = polledStatus?.status || initialStatus || 'PENDING';
  const progress = polledStatus?.workerStatus?.progress;
  const result = polledStatus?.result;
  const startedAt = polledStatus?.workerStatus?.startedAt || createdAt;

  const handleCancel = async () => {
    setIsCancelling(true);
    await cancel();
    setIsCancelling(false);
  };

  const screenshotUrls = result?.screenshotUrls || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faRobot} className="text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Auto Challenge Status
          </h3>
        </div>
        {startedAt && (
          <span className="text-sm text-gray-500">
            {formatTimeAgo(startedAt)}
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={currentStatus} />
        {reason && (
          <span className="text-sm text-gray-600">
            Reason: {formatReason(reason)}
          </span>
        )}
      </div>

      {/* In Progress: Show progress steps */}
      {currentStatus === 'IN_PROGRESS' && (
        <>
          <ProgressSteps progress={progress} />

          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-3">
              This usually takes 30-60 seconds. You can safely close this page -
              we&apos;ll update the status automatically.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="animate-spin mr-2"
                  />
                  Cancelling...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faBan} className="mr-2" />
                  Cancel
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Success: Show result */}
      {currentStatus === 'SUCCESS' && (
        <div className="space-y-3">
          {result?.referenceNumber && (
            <p className="text-sm">
              <span className="text-gray-500">Reference:</span>{' '}
              <span className="font-mono font-medium">
                {result.referenceNumber}
              </span>
            </p>
          )}

          <div className="flex gap-2 mt-4">
            {screenshotUrls.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewScreenshots?.(screenshotUrls)}
              >
                <FontAwesomeIcon icon={faImages} className="mr-2" />
                View Screenshots ({screenshotUrls.length})
              </Button>
            )}
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                <FontAwesomeIcon icon={faRotate} className="mr-2" />
                Retry Challenge
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error/Failed: Show error and retry */}
      {(currentStatus === 'ERROR' || currentStatus === 'TIMEOUT') && (
        <div className="space-y-3">
          {result?.error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {result.error}
            </p>
          )}

          {screenshotUrls.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewScreenshots?.(screenshotUrls)}
            >
              <FontAwesomeIcon icon={faImages} className="mr-2" />
              View Screenshots
            </Button>
          )}

          {onRetry && (
            <div className="mt-4">
              <Button onClick={onRetry}>
                <FontAwesomeIcon icon={faRotate} className="mr-2" />
                Retry Challenge
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cancelled */}
      {currentStatus === 'CANCELLED' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            This challenge was cancelled.
          </p>
          {onRetry && (
            <Button onClick={onRetry}>
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Try Again
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
