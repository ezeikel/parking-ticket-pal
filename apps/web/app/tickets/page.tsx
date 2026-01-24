import { Suspense } from 'react';
import { getTickets } from '@/app/actions/ticket';
import { getUserSubscriptionStatus } from '@/app/actions/user';
import { TicketsPageClient } from '@/components/tickets';
import { getUserId } from '@/utils/user';

const TicketsPageWrapper = async () => {
  const [tickets, userId] = await Promise.all([
    getTickets(),
    getUserId('view tickets'),
  ]);

  const { hasSubscription, subscriptionType } = userId
    ? await getUserSubscriptionStatus(userId)
    : { hasSubscription: false, subscriptionType: null };

  return (
    <TicketsPageClient
      tickets={tickets ?? []}
      hasSubscription={hasSubscription}
      subscriptionType={subscriptionType}
    />
  );
};

const TicketsPage = () => (
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
);

export default TicketsPage;
