import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markNotificationAsRead } from "@/api";

type Notification = {
  id: string;
  userId: string;
  ticketId: string | null;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  ticket?: {
    id: string;
    pcnNumber: string;
    status: string;
  };
};

type NotificationsResponse = {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
};

export const useNotifications = (options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) => {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', options],
    queryFn: () =>
      getNotifications(
        options?.limit,
        options?.offset,
        options?.unreadOnly
      ),
    // Refetch on window focus to keep notifications fresh
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
