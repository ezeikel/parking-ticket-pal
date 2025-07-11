'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisH,
  faPencil,
  faTrash,
} from '@fortawesome/pro-regular-svg-icons';
import DeleteTicketDialog from '@/components/DeleteTicketDialog/DeleteTicketDialog';

type TicketDetailControlsProps = {
  ticket: {
    id: string;
    pcnNumber: string;
  };
};

const TicketDetailControls = ({ ticket }: TicketDetailControlsProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <FontAwesomeIcon icon={faEllipsisH} size="lg" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/tickets/${ticket.id}/edit`}>
              <FontAwesomeIcon icon={faPencil} size="lg" className="mr-2" />
              Edit Ticket Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setIsDeleteDialogOpen(true)}
            className="text-red-500 focus:text-red-500"
          >
            <FontAwesomeIcon icon={faTrash} size="lg" className="mr-2" />
            Delete Ticket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteTicketDialog
        ticket={ticket}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
};

export default TicketDetailControls;
