import PageWrap from '@/components/PageWrap/PageWrap';
import UploadButton from '@/components/buttons/UploadButton/UploadButton';
import TicketsTable from '@/components/tables/TicketsTable/TicketsTable';

const DashboardPage = () => {
  return (
    <PageWrap>
      <div className="flex justify-between">
        <h1 className="font-semibold text-lg mb-8 md:text-2xl">Tickets</h1>
        <UploadButton />
      </div>
      <TicketsTable />
    </PageWrap>
  );
};

export default DashboardPage;
