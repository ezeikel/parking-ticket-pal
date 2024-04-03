import PageWrap from '@/components/PageWrap/PageWrap';
import TicketTable from '@/components/tables/TicketTable/TicketTable';

const DashboardPage = () => {
  return (
    <PageWrap>
      <h1 className="font-semibold text-lg mb-4 md:text-2xl">Tickets</h1>
      <TicketTable />
    </PageWrap>
  );
};

export default DashboardPage;
