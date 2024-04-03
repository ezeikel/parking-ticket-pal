'use client';

import formatPenniesToPounds from '@/utils/formatPenniesToPounds';
import { faWandMagicSparkles, faEye } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Ticket } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistance } from 'date-fns';
import Link from 'next/link';

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
  // TODO: action buttons
  {
    id: 'actions',
    cell: ({ row }) => {
      return (
        <div className="flex gap-4">
          <Link href={`ticket/${row.original.id}`}>
            <FontAwesomeIcon
              icon={faEye}
              size="lg"
              className="cursor-pointer"
            />
          </Link>
          <Link href={`ticket/${row.original.id}/ai`}>
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              size="lg"
              className="cursor-pointer"
            />
          </Link>
        </div>
      );
    },
  },
];

export default columns;
