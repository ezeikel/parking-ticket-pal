import { useQuery } from '@tanstack/react-query';
import { DraftTicket } from '@/types';
import { getDraftTickets } from '@/api';

type DraftTicketsResponse = {
  draftTickets: DraftTicket[];
};

const useDraftTickets = () =>
  useQuery<DraftTicketsResponse>({
    queryKey: ['draftTickets'],
    queryFn: getDraftTickets,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

export default useDraftTickets;
