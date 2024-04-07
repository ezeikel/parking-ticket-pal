import { getTickets } from '@/app/actions';
import DataTable from '../DataTable/DataTable';
import columns from './columns';

const TicketsTable = async () => {
  const tickets = await getTickets();

  if (!tickets) {
    // TODO: UI for empty state
    return null;
  }

  return <DataTable columns={columns} data={tickets} />;
};

export default TicketsTable;
