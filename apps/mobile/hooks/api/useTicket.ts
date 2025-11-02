import { useQuery } from "@tanstack/react-query";
import { Ticket } from "@/types";
import { getTicket } from "@/api";

type TicketResponse = {
  ticket: Ticket;
}

const useTicket = (ticketId: string) =>
  useQuery<TicketResponse>({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicket(ticketId),
    enabled: !!ticketId,
  });

export default useTicket;
