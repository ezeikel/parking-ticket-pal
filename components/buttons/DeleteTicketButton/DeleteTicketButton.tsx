'use client';

import { useRouter } from 'next/navigation';
import { deleteTicket } from '@/app/actions/ticket';
import DeleteButton from '@/components/buttons/DeleteButton/DeleteButton';

type DeleteTicketButtonProps = {
  ticketId: string;
};

const DeleteTicketButton = ({ ticketId }: DeleteTicketButtonProps) => {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteTicket(ticketId);
      router.push('/tickets');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      // You might want to show a toast notification here
    }
  };

  return (
    <form action={handleDelete}>
      <DeleteButton label="Delete Ticket" loadingLabel="Deleting Ticket..." />
    </form>
  );
};

export default DeleteTicketButton;
