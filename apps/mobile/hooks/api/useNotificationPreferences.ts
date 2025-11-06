import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotificationPreferences, updateNotificationPreferences } from "@/api";

export type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
};

type PreferencesResponse = {
  success: boolean;
  preferences: NotificationPreferences;
};

export const useNotificationPreferences = () => {
  return useQuery<PreferencesResponse>({
    queryKey: ['notificationPreferences'],
    queryFn: getNotificationPreferences,
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      updateNotificationPreferences(preferences),
    onMutate: async (newPreferences) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notificationPreferences'] });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<PreferencesResponse>(['notificationPreferences']);

      // Optimistically update to the new value
      queryClient.setQueryData<PreferencesResponse>(['notificationPreferences'], (old) => {
        if (!old) return old;
        return {
          ...old,
          preferences: newPreferences,
        };
      });

      // Return a context object with the snapshotted value
      return { previousPreferences };
    },
    onError: (err, newPreferences, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPreferences) {
        queryClient.setQueryData(['notificationPreferences'], context.previousPreferences);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with the server
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });
};
