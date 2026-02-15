import { useState, useCallback, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faGlobe,
  faLock,
  faArrowsRotate,
  faCircleCheck,
  faTriangleExclamation,
  faClock,
  faImage,
} from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { checkTicketLiveStatus, pollTicketLiveStatus } from '@/api';

type LiveStatusData = {
  portalStatus: string;
  mappedStatus: string | null;
  outstandingAmount: number;
  canChallenge: boolean;
  canPay: boolean;
  screenshotUrl?: string;
  checkedAt: string;
};

type LiveStatusCardProps = {
  ticketId: string;
  isPremium: boolean;
  issuer: string;
  lastCheck?: LiveStatusData | null;
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

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toFixed(2)}`;

const getStatusDisplay = (
  portalStatus: string,
  mappedStatus: string | null,
  canChallenge: boolean,
  canPay: boolean,
) => {
  const lower = portalStatus.toLowerCase();

  if (lower.includes('check failed') || lower.includes('cannot match')) {
    return { label: 'Unable to Verify', icon: faTriangleExclamation, color: '#6B7280', bgColor: '#F3F4F6' };
  }
  if (lower.includes('closed') || mappedStatus === 'CANCELLED' || mappedStatus === 'REPRESENTATION_ACCEPTED') {
    return { label: 'Case Closed', icon: faCircleCheck, color: '#059669', bgColor: '#ECFDF5' };
  }
  if (lower.includes('paid') || mappedStatus === 'PAID') {
    return { label: 'Paid', icon: faCircleCheck, color: '#059669', bgColor: '#ECFDF5' };
  }
  if (mappedStatus === 'FORMAL_REPRESENTATION') {
    return { label: 'Challenge Pending', icon: faClock, color: '#D97706', bgColor: '#FFFBEB' };
  }
  if (lower.includes('enforcement') || lower.includes('bailiff') || mappedStatus === 'ENFORCEMENT_BAILIFF_STAGE') {
    return { label: 'Enforcement', icon: faTriangleExclamation, color: '#DC2626', bgColor: '#FEF2F2' };
  }
  if (canChallenge || canPay) {
    return { label: 'Action Required', icon: faTriangleExclamation, color: '#D97706', bgColor: '#FFFBEB' };
  }
  return { label: 'Status Unknown', icon: faClock, color: '#6B7280', bgColor: '#F9FAFB' };
};

export default function LiveStatusCard({
  ticketId,
  isPremium,
  issuer,
  lastCheck,
  onViewScreenshot,
}: LiveStatusCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LiveStatusData | null>(lastCheck ?? null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const pollForResult = useCallback(async () => {
    const pollInterval = 3000;
    const maxAttempts = 60;
    let attempts = 0;

    setIsChecking(true);
    setProgressMessage('Starting status check...');

    while (attempts < maxAttempts) {
      try {
        const data = await pollTicketLiveStatus(ticketId);

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
          break;
        }

        if (data.status === 'failed') {
          Alert.alert('Status Check Failed', data.result?.errorMessage || data.error || 'Could not check status on portal');
          break;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    if (attempts >= maxAttempts) {
      Alert.alert('Timeout', 'The check is taking longer than expected. Please try again.');
    }

    setIsChecking(false);
    setProgressMessage(null);
  }, [ticketId]);

  const handleCheckStatus = async () => {
    try {
      setIsChecking(true);
      const result = await checkTicketLiveStatus(ticketId);

      if (result.success && result.jobId) {
        pollForResult();
      } else if (result.success && result.status) {
        setCurrentStatus(result.status);
        setIsChecking(false);
      } else {
        Alert.alert('Error', result.error || 'Could not start status check');
        setIsChecking(false);
      }
    } catch {
      Alert.alert('Error', 'Could not start status check');
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!isPremium) return;

    const checkPending = async () => {
      try {
        const data = await pollTicketLiveStatus(ticketId);
        if (data.status === 'running') {
          pollForResult();
        }
      } catch {
        // Silently fail
      }
    };

    checkPending();
  }, [ticketId, isPremium, pollForResult]);

  // Locked state for non-premium
  if (!isPremium) {
    return (
      <View className="rounded-2xl border border-border bg-white p-4 mb-4 overflow-hidden">
        {/* Locked overlay */}
        <View className="absolute inset-0 bg-white/80 z-10 items-center justify-center" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <FontAwesomeIcon icon={faLock} size={24} color="#9CA3AF" />
          <Text className="font-jakarta-medium text-sm text-gray mt-2">Premium Feature</Text>
          <Text className="font-jakarta text-xs text-gray">Upgrade to check live portal status</Text>
        </View>

        <View className="flex-row items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faGlobe} size={18} color="#1abc9c" />
          <Text className="font-jakarta-semibold text-lg text-dark">Live Portal Status</Text>
        </View>
        <View style={{ opacity: 0.3 }}>
          <View className="h-12 bg-light rounded-lg mb-3" />
          <View className="h-8 bg-light rounded-lg w-2/3" />
        </View>
      </View>
    );
  }

  const statusDisplay = currentStatus
    ? getStatusDisplay(currentStatus.portalStatus, currentStatus.mappedStatus, currentStatus.canChallenge, currentStatus.canPay)
    : null;

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <FontAwesomeIcon icon={faGlobe} size={18} color="#1abc9c" />
          <Text className="font-jakarta-semibold text-lg text-dark">Live Portal Status</Text>
        </View>
        {currentStatus && (
          <Text className="font-jakarta text-xs text-gray">
            {formatTimeAgo(currentStatus.checkedAt)}
          </Text>
        )}
      </View>

      {currentStatus ? (
        <View>
          {/* Status badge */}
          <View
            className="flex-row items-center gap-2 rounded-full px-3 py-1.5 self-start mb-3"
            style={{ backgroundColor: statusDisplay?.bgColor }}
          >
            <FontAwesomeIcon icon={statusDisplay?.icon || faClock} size={14} color={statusDisplay?.color} />
            <Text className="font-jakarta-medium text-sm" style={{ color: statusDisplay?.color }}>
              {statusDisplay?.label}
            </Text>
          </View>

          {/* Portal status text */}
          {currentStatus.portalStatus ? (
            <Text className="font-jakarta text-sm text-gray mb-3">{currentStatus.portalStatus}</Text>
          ) : null}

          {/* Outstanding amount */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-jakarta text-sm text-gray">Outstanding:</Text>
            <Text className="font-jakarta-semibold text-sm text-dark">
              {formatAmount(currentStatus.outstandingAmount)}
            </Text>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2 pt-2">
            {currentStatus.screenshotUrl && onViewScreenshot && (
              <SquishyPressable onPress={() => onViewScreenshot(currentStatus.screenshotUrl!)}>
                <View className="flex-row items-center rounded-lg border border-border px-3 py-2">
                  <FontAwesomeIcon icon={faImage} size={12} color="#717171" style={{ marginRight: 6 }} />
                  <Text className="font-jakarta-medium text-xs text-dark">View Screenshot</Text>
                </View>
              </SquishyPressable>
            )}
            <SquishyPressable onPress={handleCheckStatus} disabled={isChecking}>
              <View className="flex-row items-center rounded-lg border border-border px-3 py-2">
                {isChecking ? (
                  <>
                    <ActivityIndicator size="small" color="#717171" style={{ marginRight: 6 }} />
                    <Text className="font-jakarta-medium text-xs text-dark">
                      {progressMessage || 'Checking...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faArrowsRotate} size={12} color="#717171" style={{ marginRight: 6 }} />
                    <Text className="font-jakarta-medium text-xs text-dark">Refresh Status</Text>
                  </>
                )}
              </View>
            </SquishyPressable>
          </View>

          <Text className="font-jakarta text-xs text-gray mt-3">
            Last synced from {issuer} portal
          </Text>
        </View>
      ) : (
        <View>
          <Text className="font-jakarta text-sm text-gray mb-4">
            Check the live status of your ticket directly from the council portal.
          </Text>
          <SquishyPressable onPress={handleCheckStatus} disabled={isChecking}>
            <View className="bg-dark rounded-xl p-3.5 flex-row items-center justify-center">
              {isChecking ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text className="font-jakarta-semibold text-sm text-white">
                    {progressMessage || 'Checking Portal...'}
                  </Text>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faGlobe} size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text className="font-jakarta-semibold text-sm text-white">Check Live Status</Text>
                </>
              )}
            </View>
          </SquishyPressable>
          <Text className="font-jakarta text-xs text-gray mt-3">
            We'll check the {issuer} portal for the latest status
          </Text>
        </View>
      )}
    </View>
  );
}
