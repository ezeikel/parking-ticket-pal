import { IssuerType, TickeStatus, Ticket, TicketType } from '@prisma/client';
import { previousMonday } from 'date-fns';
import DataTable from '../DataTable/DataTable';
import columns from './columns';

const DUMMY_TICKETS: Ticket[] = [
  {
    id: '1',
    pcnNumber: 'ZY0853694A',
    type: TicketType.PENALTY_CHARGE_NOTICE,
    amountDue: 6000,
    issuer: 'Lewisham Council',
    issuerType: IssuerType.COUNCIL,
    contraventionId: 'contravention1',
    description: null,
    dateOfContravention: previousMonday(new Date()),
    dateIssued: previousMonday(new Date()),
    status: [TickeStatus.REDUCED_PAYMENT_DUE],
    vehicleId: 'vehicle1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const TicketsTable = () => {
  return <DataTable columns={columns} data={DUMMY_TICKETS} />;
};

export default TicketsTable;
