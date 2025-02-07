import PageWrap from '@/components/PageWrap/PageWrap';
import TicketsTable from '@/components/tables/TicketsTable/TicketsTable';
import DynamicUploadButton from '@/components/buttons/DynamicUploadButton';

// account for openai api calls
export const maxDuration = 30;

const DashboardPage = async () => {
  return (
    <PageWrap>
      <div className="flex justify-between">
        <h1 className="font-semibold text-lg mb-8 md:text-2xl">Tickets</h1>
        <DynamicUploadButton />
      </div>
      <TicketsTable />
    </PageWrap>
  );
};

export default DashboardPage;
