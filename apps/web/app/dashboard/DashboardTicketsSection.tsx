import {
  TicketTier,
  Prisma,
  SubscriptionType,
} from '@parking-ticket-pal/db/types';
import { getTickets } from '@/app/actions/ticket';
import { getUserSubscriptionStatus } from '@/app/actions/user';
import { getUserId } from '@/utils/user';
import DashboardTicketsSectionClient from './DashboardTicketsSectionClient';

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    vehicle: true;
    media: { select: { url: true } };
    prediction: true;
  };
}>;

type TicketStatus =
  | 'NEEDS_ACTION'
  | 'PENDING_APPEAL'
  | 'WON'
  | 'LOST'
  | 'PAID'
  | 'OVERDUE';

const mapTicketStatus = (status: string): TicketStatus => {
  const needsActionStatuses = [
    'ISSUED_DISCOUNT_PERIOD',
    'ISSUED_FULL_CHARGE',
    'NOTICE_TO_OWNER',
    'NOTICE_TO_KEEPER',
  ];
  const pendingStatuses = [
    'FORMAL_REPRESENTATION',
    'APPEAL_TO_TRIBUNAL',
    'APPEAL_SUBMITTED_TO_OPERATOR',
    'POPLA_APPEAL',
    'IAS_APPEAL',
    'TEC_OUT_OF_TIME_APPLICATION',
    'PE2_PE3_APPLICATION',
  ];
  const wonStatuses = ['REPRESENTATION_ACCEPTED', 'APPEAL_UPHELD'];
  const lostStatuses = [
    'NOTICE_OF_REJECTION',
    'APPEAL_REJECTED_BY_OPERATOR',
    'APPEAL_REJECTED',
  ];
  const overdueStatuses = [
    'CHARGE_CERTIFICATE',
    'ORDER_FOR_RECOVERY',
    'ENFORCEMENT_BAILIFF_STAGE',
    'DEBT_COLLECTION',
    'COURT_PROCEEDINGS',
    'CCJ_ISSUED',
  ];

  if (needsActionStatuses.includes(status)) return 'NEEDS_ACTION';
  if (pendingStatuses.includes(status)) return 'PENDING_APPEAL';
  if (wonStatuses.includes(status)) return 'WON';
  if (lostStatuses.includes(status)) return 'LOST';
  if (overdueStatuses.includes(status)) return 'OVERDUE';
  if (status === 'PAID') return 'PAID';
  return 'NEEDS_ACTION';
};

const DashboardTicketsSection = async () => {
  const [ticketsData, userId] = await Promise.all([
    getTickets(),
    getUserId('view dashboard'),
  ]);

  const { hasSubscription, subscriptionType } = userId
    ? await getUserSubscriptionStatus(userId)
    : {
        hasSubscription: false,
        subscriptionType: null as SubscriptionType | null,
      };

  const now = new Date();

  const ticketsList: TicketWithRelations[] = ticketsData ?? [];
  const tickets = ticketsList.slice(0, 10).map((ticket) => {
    const dueDate = new Date(ticket.issuedAt);
    dueDate.setDate(dueDate.getDate() + 14);
    const deadlineDays = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const location = ticket.location as {
      line1?: string;
      coordinates?: { latitude: number; longitude: number };
    } | null;

    return {
      id: ticket.id,
      pcnNumber: ticket.pcnNumber,
      issuer: ticket.issuer || 'Unknown Issuer',
      status: mapTicketStatus(ticket.status),
      amount: ticket.initialAmount,
      location: location?.line1 || 'Location not specified',
      issuedAt: ticket.issuedAt.toISOString(),
      deadlineDays,
      successPrediction: ticket.prediction?.percentage,
      vehicleReg: ticket.vehicle?.registrationNumber,
      tier: ticket.tier as TicketTier,
      coordinates: location?.coordinates
        ? {
            lat: location.coordinates.latitude,
            lng: location.coordinates.longitude,
          }
        : undefined,
    };
  });

  return (
    <DashboardTicketsSectionClient
      tickets={tickets}
      hasSubscription={hasSubscription}
      subscriptionType={subscriptionType}
    />
  );
};

export default DashboardTicketsSection;
