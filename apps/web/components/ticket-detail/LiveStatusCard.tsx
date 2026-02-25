/* eslint-disable no-await-in-loop, no-plusplus, no-promise-executor-return, no-continue */
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSync,
  faCheckCircle,
  faExclamationTriangle,
  faClock,
  faImage,
  faLock,
  faSpinnerThird,
  faGlobe,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { checkLiveStatus } from '@/app/actions/checkLiveStatus';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

// Use string literal type instead of importing from db package (Prisma can't run in browser)
type TicketTier = 'FREE' | 'PREMIUM';

type PollResponse = {
  status: 'running' | 'completed' | 'failed' | 'no_job' | 'unknown';
  progress?: {
    step: string;
    stepNumber: number;
    totalSteps: number;
    message: string;
  };
  result?: {
    portalStatus?: string;
    mappedStatus?: string | null;
    outstandingAmount?: number;
    canChallenge?: boolean;
    canPay?: boolean;
    screenshotUrl?: string;
    checkedAt?: string;
    error?: string;
    errorMessage?: string;
  };
  error?: string;
};

type LiveStatusCardProps = {
  ticketId: string;
  tier: TicketTier;
  issuer: string;
  lastCheck?: {
    portalStatus: string;
    mappedStatus: string | null;
    outstandingAmount: number;
    canChallenge: boolean;
    canPay: boolean;
    screenshotUrl?: string;
    checkedAt: string;
  } | null;
  onStatusChange?: (newStatus: string) => void;
  onViewScreenshot?: (url: string) => void;
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getStatusDisplay = (
  portalStatus: string,
  mappedStatus: string | null,
  canChallenge: boolean,
  canPay: boolean,
  isError?: boolean,
): {
  label: string;
  icon: typeof faCheckCircle;
  color: string;
  bgColor: string;
} => {
  // Check failed / error state
  if (
    isError ||
    portalStatus.toLowerCase().includes('check failed') ||
    portalStatus.toLowerCase().includes('cannot match')
  ) {
    return {
      label: 'Unable to Verify',
      icon: faExclamationTriangle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    };
  }

  // Case closed / cancelled
  if (
    portalStatus.toLowerCase().includes('closed') ||
    mappedStatus === 'CANCELLED' ||
    mappedStatus === 'REPRESENTATION_ACCEPTED'
  ) {
    return {
      label: 'Case Closed',
      icon: faCheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    };
  }

  // Paid
  if (portalStatus.toLowerCase().includes('paid') || mappedStatus === 'PAID') {
    return {
      label: 'Paid',
      icon: faCheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    };
  }

  // Pending challenge / formal representation - only when explicitly in that status
  if (mappedStatus === 'FORMAL_REPRESENTATION') {
    return {
      label: 'Challenge Pending',
      icon: faClock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    };
  }

  // Enforcement stage
  if (
    portalStatus.toLowerCase().includes('enforcement') ||
    portalStatus.toLowerCase().includes('bailiff') ||
    mappedStatus === 'ENFORCEMENT_BAILIFF_STAGE'
  ) {
    return {
      label: 'Enforcement',
      icon: faExclamationTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    };
  }

  // Active / can take action
  if (canChallenge || canPay) {
    return {
      label: 'Action Required',
      icon: faExclamationTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    };
  }

  // Default / unknown
  return {
    label: 'Status Unknown',
    icon: faClock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  };
};

export default function LiveStatusCard({
  ticketId,
  tier,
  issuer,
  lastCheck,
  onStatusChange: _onStatusChange,
  onViewScreenshot,
}: LiveStatusCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isPolling, setIsPolling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lastCheck);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const isPremium = tier === 'PREMIUM';

  // Poll for status check result
  const pollForResult = useCallback(async () => {
    const pollInterval = 3000; // 3 seconds
    const maxAttempts = 60; // 3 minutes max
    let attempts = 0;

    setIsPolling(true);
    setProgressMessage('Starting status check...');

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/live-status`);
        const data: PollResponse = await response.json();

        if (data.status === 'running') {
          setProgressMessage(data.progress?.message || 'Checking portal...');
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }

        if (data.status === 'completed' && data.result) {
          setCurrentStatus({
            portalStatus: data.result.portalStatus || '',
            mappedStatus: data.result.mappedStatus || null,
            outstandingAmount: data.result.outstandingAmount || 0,
            canChallenge: data.result.canChallenge || false,
            canPay: data.result.canPay || false,
            screenshotUrl: data.result.screenshotUrl,
            checkedAt: data.result.checkedAt || new Date().toISOString(),
          });
          toast.success('Status checked', {
            description:
              data.result.portalStatus || 'Status retrieved successfully',
          });
          break;
        }

        if (data.status === 'failed') {
          const errorMessage =
            data.result?.error === 'PCN_NOT_FOUND'
              ? 'PCN not found on portal - it may have been removed from the system'
              : data.result?.errorMessage ||
                data.error ||
                'Could not check status on portal';

          toast.error('Status check failed', {
            description: errorMessage,
          });

          if (data.result?.screenshotUrl) {
            setCurrentStatus({
              portalStatus:
                data.result.errorMessage || 'Check failed - see screenshot',
              mappedStatus: null,
              outstandingAmount: 0,
              canChallenge: false,
              canPay: false,
              screenshotUrl: data.result.screenshotUrl,
              checkedAt: new Date().toISOString(),
            });
          }
          break;
        }

        // Unknown status - try again
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.error(
          'Poll error',
          { page: 'live-status' },
          error instanceof Error ? error : undefined,
        );
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    if (attempts >= maxAttempts) {
      toast.error('Status check timed out', {
        description:
          'The check is taking longer than expected. Please try again.',
      });
    }

    setIsPolling(false);
    setProgressMessage(null);
  }, [ticketId]);

  const handleCheckStatus = () => {
    startTransition(async () => {
      const result = await checkLiveStatus(ticketId);

      if (result.success && result.jobId) {
        // Job started - poll for result
        pollForResult();
      } else if (result.success && result.status) {
        // Sync result (shouldn't happen with new async flow, but handle it)
        setCurrentStatus(result.status);
        toast.success('Status checked', {
          description: result.status.portalStatus || 'No changes detected',
        });
      } else {
        // Error starting job
        const errorMessage =
          result.errorCode === 'PCN_NOT_FOUND'
            ? 'PCN not found on portal - it may have been removed from the system'
            : result.error || 'Could not start status check';

        toast.error('Status check failed', {
          description: errorMessage,
        });
      }
    });
  };

  // Check if there's a pending job on mount
  useEffect(() => {
    const checkPendingJob = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/live-status`);
        const data: PollResponse = await response.json();

        if (data.status === 'running') {
          // There's a job in progress - start polling
          pollForResult();
        }
      } catch (error) {
        logger.error(
          'Error checking pending job',
          { page: 'live-status' },
          error instanceof Error ? error : undefined,
        );
      }
    };

    if (isPremium) {
      checkPendingJob();
    }
  }, [ticketId, isPremium, pollForResult]);

  const isLoading = isPending || isPolling;

  // Not premium - show locked state
  if (!isPremium) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-border bg-white p-5 md:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <FontAwesomeIcon
              icon={faLock}
              className="h-8 w-8 text-gray-400 mb-2"
            />
            <p className="text-sm font-medium text-gray-600">Premium Feature</p>
            <p className="text-xs text-gray-500">
              Upgrade to check live portal status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faGlobe} className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-dark">
            Live Portal Status
          </h2>
        </div>

        <div className="opacity-30">
          <div className="h-12 bg-gray-100 rounded mb-3" />
          <div className="h-8 bg-gray-100 rounded w-2/3" />
        </div>
      </motion.div>
    );
  }

  // Premium - show status card
  const statusDisplay = currentStatus
    ? getStatusDisplay(
        currentStatus.portalStatus,
        currentStatus.mappedStatus,
        currentStatus.canChallenge,
        currentStatus.canPay,
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faGlobe} className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-dark">
            Live Portal Status
          </h2>
        </div>
        {currentStatus && (
          <span className="text-xs text-gray-500">
            {formatTimeAgo(currentStatus.checkedAt)}
          </span>
        )}
      </div>

      {currentStatus ? (
        <div className="space-y-4">
          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusDisplay?.bgColor}`}
          >
            <FontAwesomeIcon
              icon={statusDisplay?.icon || faClock}
              className={`h-4 w-4 ${statusDisplay?.color}`}
            />
            <span className={`text-sm font-medium ${statusDisplay?.color}`}>
              {statusDisplay?.label}
            </span>
          </div>

          {/* Portal status text */}
          {currentStatus.portalStatus && (
            <p className="text-sm text-gray-600">
              {currentStatus.portalStatus}
            </p>
          )}

          {/* Outstanding amount */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Outstanding:</span>
            <span className="font-medium text-dark">
              {formatAmount(currentStatus.outstandingAmount)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {currentStatus.screenshotUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewScreenshot?.(currentStatus.screenshotUrl!)}
              >
                <FontAwesomeIcon icon={faImage} className="mr-1.5 h-3 w-3" />
                View Screenshot
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckStatus}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="mr-1.5 h-3 w-3 animate-spin"
                  />
                  {progressMessage || 'Checking...'}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSync} className="mr-1.5 h-3 w-3" />
                  Refresh Status
                </>
              )}
            </Button>
          </div>

          {/* Info text */}
          <p className="text-xs text-gray-400 pt-1">
            Last synced from {issuer} portal
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Check the live status of your ticket directly from the council
            portal.
          </p>

          <Button
            variant="default"
            size="sm"
            onClick={handleCheckStatus}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="mr-2 h-4 w-4 animate-spin"
                />
                {progressMessage || 'Checking Portal...'}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faGlobe} className="mr-2 h-4 w-4" />
                Check Live Status
              </>
            )}
          </Button>

          <p className="text-xs text-gray-400">
            We&apos;ll check the {issuer} portal for the latest status
          </p>
        </div>
      )}
    </motion.div>
  );
}
