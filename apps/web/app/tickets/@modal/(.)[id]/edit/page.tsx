import Modal from '@/components/Modal/Modal';
import EditTicketForm from '@/components/forms/EditTicketForm/EditTicketForm';
import { getTicket } from '@/app/actions/ticket';

type EditTicketModalProps = {
  params: Promise<{
    id: string;
  }>;
};

// intercepting page - it renders the EditTicketForm inside our Modal component
const EditTicketModal = async ({ params }: EditTicketModalProps) => {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) {
    return (
      <Modal>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Ticket not found</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal>
      <EditTicketForm ticket={ticket} />
    </Modal>
  );
};

export default EditTicketModal;
