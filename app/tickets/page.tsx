import { Suspense } from 'react';
import TicketsContainer from '../dashboard/TicketsContainer';
import { getTickets } from '../actions';

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
