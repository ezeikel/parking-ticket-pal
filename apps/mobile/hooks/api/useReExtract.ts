import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reExtractFromImage } from '@/api';

export default function useReExtract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => reExtractFromImage(ticketId),
    onSuccess: (_data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
