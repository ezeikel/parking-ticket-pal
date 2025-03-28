'use client';

import { useRouter } from 'next/navigation';
import { faEdit } from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';

type EditTicketButtonProps = {
  id: string;
};

const EditTicketButton = ({ id }: EditTicketButtonProps) => {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      className="flex items-center gap-2"
      onClick={() => router.push(`/tickets/${id}?edit=true`)}
    >
      <FontAwesomeIcon icon={faEdit} className="h-4 w-4" />
      <span>Edit Ticket</span>
    </Button>
  );
};

export default EditTicketButton;
