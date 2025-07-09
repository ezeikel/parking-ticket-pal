import { getTicket } from '@/app/actions/ticket';
import EditTicketForm from '@/components/forms/EditTicketForm/EditTicketForm';

type EditTicketPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// "real" page that loads on a refresh or direct navigation of parallel route
const EditTicketPage = async ({ params }: EditTicketPageProps) => {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) {
    return (
      <div className="container mx-auto py-12">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <EditTicketForm ticket={ticket} />
    </div>
  );
};

export default EditTicketPage;
