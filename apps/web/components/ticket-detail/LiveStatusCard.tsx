'use client';

import { useState, useTransition } from 'react';
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

// Use string literal type instead of importing from db package (Prisma can't run in browser)
type TicketTier = 'FREE' | 'STANDARD' | 'PREMIUM';
import { toast } from 'sonner';

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
  if (isError || portalStatus.toLowerCase().includes('check failed') || portalStatus.toLowerCase().includes('cannot match')) {
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
  onStatusChange,
  onViewScreenshot,
}: LiveStatusCardProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(lastCheck);

  const isPremium = tier === 'PREMIUM';

  const handleCheckStatus = () => {
    startTransition(async () => {
      const result = await checkLiveStatus(ticketId);

      if (result.success && result.status) {
        setCurrentStatus(result.status);

        if (result.statusUpdated && result.newStatus) {
          toast.success('Ticket status updated', {
            description: `Status changed from ${result.previousStatus} to ${result.newStatus}`,
          });
          onStatusChange?.(result.newStatus);
        } else {
          toast.success('Status checked', {
            description: result.status.portalStatus || 'No changes detected',
          });
        }
      } else {
        // Determine error message based on error type
        const errorMessage = result.errorCode === 'PCN_NOT_FOUND'
          ? 'PCN not found on portal - it may have been removed from the system'
          : result.error || 'Could not check status on portal';

        toast.error('Status check failed', {
          description: errorMessage,
        });

        // Still show the error screenshot if captured (useful for debugging)
        if (result.errorScreenshotUrl) {
          setCurrentStatus((prev) =>
            prev
              ? { ...prev, screenshotUrl: result.errorScreenshotUrl!, checkedAt: new Date().toISOString(), portalStatus: result.errorMessage || 'Check failed - see screenshot' }
              : {
                  portalStatus: result.errorMessage || 'Check failed - see screenshot',
                  mappedStatus: null,
                  outstandingAmount: 0,
                  canChallenge: false,
                  canPay: false,
                  screenshotUrl: result.errorScreenshotUrl!,
                  checkedAt: new Date().toISOString(),
                }
          );
        }
      }
    });
  };

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
          <h2 className="text-lg font-semibold text-dark">Live Portal Status</h2>
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
          <h2 className="text-lg font-semibold text-dark">Live Portal Status</h2>
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
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="mr-1.5 h-3 w-3 animate-spin"
                  />
                  Checking...
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
            Check the live status of your ticket directly from the council portal.
          </p>

          <Button
            variant="default"
            size="sm"
            onClick={handleCheckStatus}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="mr-2 h-4 w-4 animate-spin"
                />
                Checking Portal...
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
