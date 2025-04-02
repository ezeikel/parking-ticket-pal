import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { faArrowLeft } from '@fortawesome/pro-regular-svg-icons';
import { getTicket } from '@/app/actions';
import TicketDetail from '@/components/TicketDetail/TicketDetail';
import EditTicketForm from '@/components/forms/EditTicketForm/EditTicketForm';
import EditButton from '@/components/buttons/EditButton/EditButton';
import DeleteTicketButton from '@/components/buttons/DeleteTicketButton/DeleteTicketButton';
import { Prisma } from '@prisma/client';

type TicketPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit: string }>;
};

type Ticket = Prisma.TicketGetPayload<{
  include: {
    vehicle: {
      select: {
        registrationNumber: true;
      };
    };
    media: {
      select: {
        url: true;
      };
    };
    prediction: true;
  };
}>;

const TicketPage = async ({ params, searchParams }: TicketPageProps) => {
  const { id } = await params;
  const ticket = await getTicket(id);
  const { edit } = await searchParams;
  const isEditMode = edit === 'true';

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
        {!isEditMode && (
          <div className="flex items-center gap-2">
            <Link href={`/tickets/${id}?edit=true`}>
              <EditButton label="Edit Ticket" />
            </Link>
            <DeleteTicketButton ticketId={id} />
          </div>
        )}
      </div>
      {isEditMode ? (
        <EditTicketForm ticket={ticket as Ticket} />
      ) : (
        <TicketDetail ticket={ticket as Ticket} />
      )}
    </div>
  );
};

export default TicketPage;
