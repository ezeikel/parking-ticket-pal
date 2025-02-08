import Decimal from 'decimal.js';
import { getTickets } from '@/app/actions';
import DataTable from '../DataTable/DataTable';
import columns from './columns';

const TicketsTable = async () => {
  const tickets = await getTickets();

  if (!tickets) {
    // TODO: UI for empty state
    return null;
  }

  // Transform the data to match expected types
  const formattedTickets = tickets.map((ticket) => ({
    ...ticket,
    location: ticket.location?.map((num) => new Decimal(num)) || undefined,
  }));

  return (
    <DataTable
      columns={columns}
      data={formattedTickets}
      emptyText="You haven't uploaded a ticket yet."
    />
  );
};

export default TicketsTable;
