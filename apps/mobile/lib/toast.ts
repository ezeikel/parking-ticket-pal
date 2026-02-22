import { toast as sonnerToast } from 'sonner-native';
import * as Haptics from 'expo-haptics';

export const toast = {
  success(title: string, message?: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sonnerToast.success(title, { description: message });
  },
  error(title: string, message?: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    sonnerToast.error(title, { description: message });
  },
  info(title: string, message?: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sonnerToast(title, { description: message });
  },
};
