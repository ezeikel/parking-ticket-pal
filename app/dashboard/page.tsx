import dynamic from 'next/dynamic';
import { SubscriptionType } from '@prisma/client';
import PageWrap from '@/components/PageWrap/PageWrap';
import TicketsTable from '@/components/tables/TicketsTable/TicketsTable';
import { getSubscription, getTickets } from '../actions';

// TODO: does this opt the page out of SSR?
const UploadButton = dynamic(
  () => import('@/components/buttons/UploadButton/UploadButton'),
  {
    ssr: false,
  },
);

const DashboardPage = async () => {
  const subscription = await getSubscription();
  const tickets = await getTickets();

  return (
    <PageWrap>
      <div className="flex justify-between">
        <h1 className="font-semibold text-lg mb-8 md:text-2xl">Tickets</h1>
        <UploadButton
          hasProSubscription={subscription?.type === SubscriptionType.PRO}
          numberOfTickets={tickets?.length || 0}
          numberOfCredits={0}
        />
      </div>
      <TicketsTable />
    </PageWrap>
  );
};

export default DashboardPage;
