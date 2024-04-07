import dynamic from 'next/dynamic';
import PageWrap from '@/components/PageWrap/PageWrap';
import TicketsTable from '@/components/tables/TicketsTable/TicketsTable';

// TODO: does this opt the page out of SSR?
const UploadButton = dynamic(
  () => import('@/components/buttons/UploadButton/UploadButton'),
  {
    ssr: false,
  },
);

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
