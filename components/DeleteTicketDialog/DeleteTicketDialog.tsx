'use client';

import { useEffect , useActionState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteTicket } from '@/app/actions/ticket';
import { toast } from 'sonner';

type DeleteTicketDialogProps = {
  ticket: {
    id: string;
    pcnNumber: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DeleteTicketDialog = ({
  ticket,
  open,
  onOpenChange,
}: DeleteTicketDialogProps) => {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteTicket,
    null,
  );

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Ticket deleted successfully.');
      onOpenChange(false);
    } else if (deleteState?.error) {
      toast.error(deleteState.error);
    }
  }, [deleteState, onOpenChange]);

  const handleDelete = () => {
    const formData = new FormData();
    formData.append('ticketId', ticket.id);
    deleteAction(formData);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            ticket with PCN{' '}
            <span className="font-semibold">{ticket.pcnNumber}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete ticket'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTicketDialog;
