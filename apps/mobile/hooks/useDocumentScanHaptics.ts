import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

/**
 * Custom hook for document scanner haptic feedback
 * Provides haptic feedback at key moments during the scanning process
 */
export const useDocumentScanHaptics = () => {
  /**
   * Light impact when document is first detected
   */
  const documentDetected = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silently fail if haptics not available
      console.log('[Haptics] Light impact failed:', error);
    }
  }, []);

  /**
   * Medium impact when document confidence reaches capture threshold
   */
  const readyToCapture = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('[Haptics] Medium impact failed:', error);
    }
  }, []);

  /**
   * Light impact for countdown timer ticks
   */
  const countdownTick = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('[Haptics] Countdown tick failed:', error);
    }
  }, []);

  /**
   * Success notification when capture completes successfully
   */
  const captureSuccess = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('[Haptics] Success notification failed:', error);
    }
  }, []);

  /**
   * Error notification when capture fails
   */
  const captureError = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('[Haptics] Error notification failed:', error);
    }
  }, []);

  /**
   * Warning notification for low confidence or poor conditions
   */
  const warning = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('[Haptics] Warning notification failed:', error);
    }
  }, []);

  /**
   * Soft selection impact for UI interactions
   */
  const selectionChanged = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.log('[Haptics] Selection failed:', error);
    }
  }, []);

  return {
    documentDetected,
    readyToCapture,
    countdownTick,
    captureSuccess,
    captureError,
    warning,
    selectionChanged,
  };
};