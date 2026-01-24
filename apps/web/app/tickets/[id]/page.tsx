import { Suspense } from 'react';
import { getTicket } from '@/app/actions/ticket';
import { TicketDetailPage } from '@/components/ticket-detail';
import PaymentRedirectHandler from '@/components/PaymentRedirectHandler/PaymentRedirectHandler';

type TicketPageProps = {
  params: Promise<{ id: string }>;
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark">Ticket not found</h1>
          <p className="mt-2 text-gray">
            The ticket you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <PaymentRedirectHandler ticketId={id} />
      </Suspense>
      <TicketDetailPage ticket={ticket} />
    </>
  );
};

export default TicketPage;
