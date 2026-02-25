import { Suspense } from 'react';
import { getTickets } from '@/app/actions/ticket';
import { TicketsPageClient } from '@/components/tickets';
import AdBannerServer from '@/components/AdBanner/AdBannerServer';

const TicketsPageWrapper = async () => {
  const tickets = await getTickets();

  return <TicketsPageClient tickets={tickets ?? []} />;
};

const TicketsPage = () => (
  <>
    <Suspense
      fallback={
        <div className="container mx-auto py-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[calc(100vh-180px)] animate-pulse rounded-2xl bg-light" />
            <div className="hidden h-[calc(100vh-180px)] animate-pulse rounded-2xl bg-light lg:block" />
          </div>
        </div>
      }
    >
      <TicketsPageWrapper />
    </Suspense>
    <Suspense fallback={null}>
      <AdBannerServer
        placement="tickets-list"
        className="mx-auto max-w-7xl px-4 pb-6"
      />
    </Suspense>
  </>
);

export default TicketsPage;
