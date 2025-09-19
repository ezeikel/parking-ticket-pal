import { useMutation } from "@tanstack/react-query";
import { createTicket } from "@/api";
import { queryClient } from "@/providers";

const useCreateTicket = () => 
  useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      // Automatically refetch tickets after successful creation
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

export default useCreateTicket;