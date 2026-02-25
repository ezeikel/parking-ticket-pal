import { Suspense } from 'react';
import { getTicket } from '@/app/actions/ticket';
import { getCurrentUser } from '@/utils/user';
import { isAdFree } from '@/lib/subscription';
import TicketDetailPage from '@/components/ticket-detail/TicketDetailPage';
import PaymentRedirectHandler from '@/components/PaymentRedirectHandler/PaymentRedirectHandler';

type TicketPageProps = {
  params: Promise<{ id: string }>;
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const { id } = await params;
  const [ticket, user] = await Promise.all([getTicket(id), getCurrentUser()]);

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark">Ticket not found</h1>
          <p className="mt-2 text-gray">
            The ticket you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
        </div>
      </div>
    );
  }

  const showAds = !user || !isAdFree(user);

  return (
    <>
      <Suspense fallback={null}>
        <PaymentRedirectHandler ticketId={id} />
      </Suspense>
      <TicketDetailPage ticket={ticket} showAds={showAds} />
    </>
  );
};

export default TicketPage;
