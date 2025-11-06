import { useQuery } from "@tanstack/react-query";
import { Ticket } from "@/types";
import { getTickets, type TicketFilters } from "@/api";

type TicketsResponse = {
  tickets: Ticket[];
}

const useTickets = (filters?: TicketFilters) =>
  useQuery<TicketsResponse>({
    queryKey: ['tickets', filters],
    queryFn: () => getTickets(filters),
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Cache persists for 10 minutes
  });

export default useTickets;