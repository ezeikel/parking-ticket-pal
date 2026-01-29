'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChallengeStatus } from '@parking-ticket-pal/db';

/**
 * Progress info for challenge jobs
 */
export type ChallengeProgress = {
  step: string;
  stepNumber: number;
  totalSteps: number;
  message: string;
};

/**
 * Result from a completed challenge
 */
export type ChallengeResult = {
  success: boolean;
  screenshotUrls?: string[];
  videoUrl?: string;
  referenceNumber?: string;
  challengeText?: string;
  error?: string;
};

/**
 * Status response from the API
 */
export type ChallengeStatusResponse = {
  challengeId: string;
  status: ChallengeStatus;
  submittedAt?: string;
  createdAt?: string;
  workerStatus?: {
    jobId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: ChallengeProgress;
    error?: string;
    startedAt: string;
  };
  result?: ChallengeResult;
};

/**
 * Terminal status values that should stop polling
 */
const TERMINAL_STATUSES: ChallengeStatus[] = [
  'SUCCESS',
  'ERROR',
  'TIMEOUT',
  'CANCELLED',
];

/**
 * Hook to poll challenge status and track progress
 *
 * @param challengeId - The challenge ID to poll. Pass null to disable polling.
 * @param options - Configuration options
 */
export function useChallengeStatus(
  challengeId: string | null,
  options: {
    pollingInterval?: number;
    onComplete?: (status: ChallengeStatusResponse) => void;
    onError?: (error: Error) => void;
  } = {},
) {
  const { pollingInterval = 3000, onComplete, onError } = options;

  const [status, setStatus] = useState<ChallengeStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch the current status from the API
   */
  const fetchStatus = useCallback(async () => {
    if (!challengeId) return null;

    try {
      const response = await fetch(`/api/challenges/${challengeId}/status`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return (await response.json()) as ChallengeStatusResponse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return null;
    }
  }, [challengeId, onError]);

  /**
   * Cancel the challenge
   */
  const cancel = useCallback(async () => {
    if (!challengeId) return false;

    try {
      const response = await fetch(`/api/challenges/${challengeId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Fetch updated status
      const newStatus = await fetchStatus();
      if (newStatus) {
        setStatus(newStatus);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return false;
    }
  }, [challengeId, fetchStatus, onError]);

  /**
   * Start or stop polling based on challengeId
   */
  useEffect(() => {
    if (!challengeId) {
      setStatus(null);
      setIsPolling(false);
      setError(null);
      return;
    }

    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const poll = async () => {
      const newStatus = await fetchStatus();

      if (!mounted) return;

      if (newStatus) {
        setStatus(newStatus);

        // Check if we've reached a terminal state
        const isTerminal = TERMINAL_STATUSES.includes(
          newStatus.status as ChallengeStatus,
        );
        const workerTerminal =
          newStatus.workerStatus &&
          ['completed', 'failed', 'cancelled'].includes(
            newStatus.workerStatus.status,
          );

        if (isTerminal || workerTerminal) {
          setIsPolling(false);
          onComplete?.(newStatus);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
      }
    };

    // Start polling
    setIsPolling(true);
    setError(null);

    // Initial fetch
    poll();

    // Set up interval
    intervalId = setInterval(poll, pollingInterval);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [challengeId, pollingInterval, fetchStatus, onComplete]);

  return {
    status,
    isPolling,
    error,
    cancel,
    refetch: fetchStatus,
  };
}
