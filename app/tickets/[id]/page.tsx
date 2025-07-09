import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { faArrowLeft } from '@fortawesome/pro-regular-svg-icons';
import { getTicket } from '@/app/actions/ticket';
import TicketDetail from '@/components/TicketDetail/TicketDetail';

type TicketPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit: string }>;
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/tickets">
          <Button variant="ghost" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            <span>Back to Tickets</span>
          </Button>
        </Link>
      </div>
      <TicketDetail ticket={ticket} />
    </div>
  );
};

export default TicketPage;
