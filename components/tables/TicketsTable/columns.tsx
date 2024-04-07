'use client';

import Link from 'next/link';
import { Ticket } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles, faEye } from '@fortawesome/pro-duotone-svg-icons';
import { formatDistance } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';

const columns: ColumnDef<Ticket>[] = [
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
  },
  {
    // TODO: on hover display description
    accessorKey: 'contraventionId',
    header: 'Contravention',
  },
  {
    accessorKey: 'status',
    header: 'Status',
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
    cell: ({ row }) => {
      return (
        <div className="flex gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`ticket/${row.original.id}`}>
                  <FontAwesomeIcon
                    icon={faEye}
                    size="lg"
                    className="cursor-pointer"
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white font-sans">
                <p>View ticket</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`ticket/${row.original.id}/ai`}>
                  <FontAwesomeIcon
                    icon={faWandMagicSparkles}
                    size="lg"
                    className="cursor-pointer"
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white font-sans">
                <p>Generate a challenge letter using AI</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
];

export default columns;
