import { Suspense } from 'react';
import TicketsContainer from '@/components/TicketsContainer/TicketsContainer';
import { getTickets } from '@/app/actions/ticket';

const TicketsPage = async () => {
  const tickets = await getTickets();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<div>Loading tickets...</div>}>
        <TicketsContainer tickets={tickets ?? []} />
      </Suspense>
    </div>
  );
};

export default TicketsPage;
