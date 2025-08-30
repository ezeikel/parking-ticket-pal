import { useQuery } from "@tanstack/react-query";
import { Ticket } from "@/types";
import { getTickets } from "@/api";

type TicketsResponse = {
  tickets: Ticket[];
}

const useTickets = () => 
  useQuery<TicketsResponse>({
    queryKey: ['tickets'],
    queryFn: getTickets,
  });

export default useTickets;