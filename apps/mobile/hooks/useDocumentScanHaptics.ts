import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback for document scanner interactions.
 */
export const useDocumentScanHaptics = () => {
  const documentDetected = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
  }, []);

  const readyToCapture = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
  }, []);

  const countdownTick = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
  }, []);

  const captureSuccess = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics not available
    }
  }, []);

  const captureError = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics not available
    }
  }, []);

  return {
    documentDetected,
    readyToCapture,
    countdownTick,
    captureSuccess,
    captureError,
  };
};
