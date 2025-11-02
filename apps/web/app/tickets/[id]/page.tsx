import { Suspense } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { faArrowLeft } from '@fortawesome/pro-regular-svg-icons';
import { getTicket } from '@/app/actions/ticket';
import TicketDetail from '@/components/TicketDetail/TicketDetail';
import PaymentRedirectHandler from '@/components/PaymentRedirectHandler/PaymentRedirectHandler';

type TicketPageProps = {
  params: Promise<{ id: string }>;
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={null}>
        <PaymentRedirectHandler ticketId={id} />
      </Suspense>
      <div className="flex items-center justify-between">
        <Link href="/tickets">
          <Button variant="ghost" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowLeft} size="lg" />
            <span>Back to Tickets</span>
          </Button>
        </Link>
      </div>
      <TicketDetail ticket={ticket} />
    </div>
  );
};

export default TicketPage;
