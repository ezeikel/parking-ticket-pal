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
  faEllipsisVertical,
  faEye,
  faShieldCheck,
  faTrash,
} from '@fortawesome/pro-regular-svg-icons';

import DeleteTicketDialog from '@/components/DeleteTicketDialog/DeleteTicketDialog';

type TicketData = {
  id: string;
  pcnNumber: string;
};

type TicketCardControlsProps = {
  ticket: TicketData;
};

const TicketCardControls = ({ ticket }: TicketCardControlsProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <FontAwesomeIcon icon={faEllipsisVertical} size="lg" />
            <span className="sr-only">Ticket options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/tickets/${ticket.id}`}>
              <FontAwesomeIcon icon={faEye} size="lg" className="mr-2" />
              View Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FontAwesomeIcon icon={faShieldCheck} size="lg" className="mr-2" />
            Challenge Ticket
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

export default TicketCardControls;
