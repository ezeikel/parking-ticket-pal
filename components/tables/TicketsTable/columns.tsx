'use client';

import { Ticket } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistance } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';
import { TICKET_STATUS, TICKET_TYPE } from '@/constants';
import TicketActionsCell from '@/components/TicketActionsCell/TicketActionsCell';

const columns: ColumnDef<
  Partial<Ticket> & {
    contravention: {
      code: string;
      description: string;
    };
  },
  keyof (Partial<Ticket> & {
    contravention: {
      code: string;
      description: string;
    };
  })
>[] = [
  {
    accessorKey: 'vehicle.registration',
    header: 'Vehicle Registration',
  },
  {
    accessorKey: 'pcnNumber',
    header: 'Number',
  },
  {
    accessorKey: 'dateIssued',
    header: 'Date Issued',
    cell: (info) => `${formatDistance(info.getValue<Date>(), new Date())} ago`,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: (info) => TICKET_TYPE[info.getValue() as keyof typeof TICKET_TYPE],
  },
  {
    accessorKey: 'contravention.code',
    header: 'Contravention',
    cell: (info) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="cursor-pointer">{info.getValue()}</p>
          </TooltipTrigger>
          <TooltipContent className="bg-black text-white font-sans max-w-[300px]">
            <p>{info.row.original.contravention.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) =>
      TICKET_STATUS[info.getValue() as keyof typeof TICKET_STATUS],
  },
  {
    accessorKey: 'amountDue',
    header: 'Amount due',
    cell: (info) => {
      return formatPenniesToPounds(info.getValue<number>());
    },
  },
  {
    accessorKey: 'issuer',
    header: 'Issuer',
  },
  {
    id: 'actions',
    cell: TicketActionsCell,
  },
];

export default columns;
