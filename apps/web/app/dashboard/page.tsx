import { Suspense } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/pro-solid-svg-icons';
import { getTickets } from '@/app/actions/ticket';
import { getVehicles } from '@/app/actions/vehicle';
import { getCurrentUser } from '@/utils/user';
import { Button } from '@/components/ui/button';
import {
  UrgentAlerts,
  DashboardStatsCards,
  DashboardQuickActions,
  ActivityTimeline,
  AnalyticsCharts,
  PhonePromptCard,
  PendingTicketsBanner,
} from '@/components/dashboard';
import { getPendingTickets } from '@/app/actions/guest';
import DashboardTicketsSection from './DashboardTicketsSection';
import { getDisplayAmount } from '@/utils/getCurrentAmountDue';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { TRACKING_EVENTS } from '@/constants/events';

// Wrapper component for stats cards with data fetching
const StatsCardsWrapper = async () => {
  const tickets = (await getTickets()) ?? [];

  const totalTickets = tickets.length;

  // Calculate outstanding fines using current amount (accounts for price increases and time elapsed)
  const wonStatuses = ['REPRESENTATION_ACCEPTED', 'APPEAL_UPHELD'];
  const outstandingTickets = tickets.filter(
    (ticket) =>
      !wonStatuses.includes(ticket.status) &&
      ticket.status !== 'PAID' &&
      ticket.status !== 'CANCELLED',
  );
  const outstandingFines = outstandingTickets.reduce(
    (acc, ticket) => acc + getDisplayAmount(ticket),
    0,
  );

  // Calculate discount period amount using current amount
  const discountPeriodTickets = tickets.filter(
    (ticket) => ticket.status === 'ISSUED_DISCOUNT_PERIOD',
  );
  const discountPeriodAmount = discountPeriodTickets.reduce(
    (acc, ticket) => acc + getDisplayAmount(ticket),
    0,
  );

  // Calculate appeal success rate
  const appealResolvedStatuses = [
    'REPRESENTATION_ACCEPTED',
    'APPEAL_UPHELD',
    'NOTICE_OF_REJECTION',
    'APPEAL_REJECTED_BY_OPERATOR',
    'APPEAL_REJECTED',
  ];
  const appealsTotal = tickets.filter((ticket) =>
    appealResolvedStatuses.includes(ticket.status),
  ).length;
  const appealsWon = tickets.filter((ticket) =>
    ['REPRESENTATION_ACCEPTED', 'APPEAL_UPHELD'].includes(ticket.status),
  ).length;
  const appealSuccessRate =
    appealsTotal > 0 ? Math.round((appealsWon / appealsTotal) * 100) : 0;

  // Calculate tickets due this week
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueThisWeek = tickets.filter((ticket) => {
    const dueDate = new Date(ticket.issuedAt);
    dueDate.setDate(dueDate.getDate() + 14); // Assuming 14 days deadline
    return (
      dueDate > now &&
      dueDate < weekFromNow &&
      !wonStatuses.includes(ticket.status) &&
      ticket.status !== 'PAID'
    );
  }).length;

  // Calculate next deadline
  const upcomingTickets = tickets
    .filter(
      (ticket) =>
        !wonStatuses.includes(ticket.status) && ticket.status !== 'PAID',
    )
    .map((ticket) => {
      const dueDate = new Date(ticket.issuedAt);
      dueDate.setDate(dueDate.getDate() + 14);
      return { ...ticket, dueDate };
    })
    .filter((ticket) => ticket.dueDate > now)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const nextDeadlineDays =
    upcomingTickets.length > 0
      ? Math.ceil(
          (upcomingTickets[0].dueDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : undefined;

  // Count tickets this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ticketsThisMonth = tickets.filter(
    (ticket) => new Date(ticket.createdAt) >= startOfMonth,
  ).length;

  return (
    <DashboardStatsCards
      totalTickets={totalTickets}
      outstandingFines={outstandingFines}
      appealSuccessRate={appealSuccessRate}
      dueThisWeek={dueThisWeek}
      ticketsThisMonth={ticketsThisMonth}
      discountPeriodAmount={discountPeriodAmount}
      appealsWon={appealsWon}
      appealsTotal={appealsTotal}
      nextDeadlineDays={nextDeadlineDays}
    />
  );
};

// Wrapper component for quick actions with counts
const QuickActionsWrapper = async () => {
  const tickets = (await getTickets()) ?? [];
  const vehicles = (await getVehicles()) ?? [];

  return (
    <DashboardQuickActions
      ticketCount={tickets.length}
      vehicleCount={vehicles.length}
      documentCount={0} // TODO: Implement document count
    />
  );
};

// Wrapper component for urgent alerts
const UrgentAlertsWrapper = async () => {
  const tickets = (await getTickets()) ?? [];

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const wonStatuses = ['REPRESENTATION_ACCEPTED', 'APPEAL_UPHELD'];

  // Find tickets with deadlines in the next 7 days
  const urgentTickets = tickets
    .filter(
      (ticket) =>
        !wonStatuses.includes(ticket.status) && ticket.status !== 'PAID',
    )
    .map((ticket) => {
      const dueDate = new Date(ticket.issuedAt);
      dueDate.setDate(dueDate.getDate() + 14);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { ...ticket, dueDate, daysUntilDue };
    })
    .filter((ticket) => ticket.dueDate > now && ticket.dueDate < weekFromNow);

  if (urgentTickets.length === 0) {
    return null;
  }

  const alerts = [
    {
      id: 'urgent-tickets',
      type: 'warning' as const,
      title: 'Action Required',
      message: `You have ${urgentTickets.length} ticket${urgentTickets.length > 1 ? 's' : ''} with deadlines in the next 7 days`,
      subMessage:
        urgentTickets.filter((t) => t.daysUntilDue <= 1).length > 0
          ? `${urgentTickets.filter((t) => t.daysUntilDue <= 1).length} ticket due tomorrow`
          : undefined,
      cta: 'View Urgent Tickets',
      href: '/tickets?status=urgent',
    },
  ];

  return <UrgentAlerts alerts={alerts} />;
};

// Wrapper component for activity timeline
const ActivityTimelineWrapper = async () => {
  const tickets = (await getTickets()) ?? [];

  // Generate activities from recent ticket events
  const activities = tickets.slice(0, 5).map((ticket) => {
    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let timestamp: string;
    let group: string;

    if (diffDays === 0) {
      timestamp = 'Today';
      group = 'Today';
    } else if (diffDays === 1) {
      timestamp = 'Yesterday';
      group = 'Yesterday';
    } else if (diffDays < 7) {
      timestamp = `${diffDays} days ago`;
      group = 'This Week';
    } else {
      timestamp = `${diffDays} days ago`;
      group = 'Earlier';
    }

    return {
      id: ticket.id,
      type: 'ticket_uploaded' as const,
      title: `Ticket Uploaded - ${ticket.pcnNumber}`,
      description: `${ticket.issuer || 'Unknown issuer'}`,
      metadata: `Vehicle: ${ticket.vehicle?.registrationNumber || 'Unknown'}`,
      timestamp,
      group,
    };
  });

  return <ActivityTimeline activities={activities} />;
};

// Wrapper component for analytics charts
const AnalyticsChartsWrapper = async () => {
  const tickets = (await getTickets()) ?? [];

  // Calculate status breakdown
  const wonStatuses = ['REPRESENTATION_ACCEPTED', 'APPEAL_UPHELD'];
  const lostStatuses = [
    'NOTICE_OF_REJECTION',
    'APPEAL_REJECTED_BY_OPERATOR',
    'APPEAL_REJECTED',
  ];
  const pendingStatuses = [
    'FORMAL_REPRESENTATION',
    'APPEAL_TO_TRIBUNAL',
    'APPEAL_SUBMITTED_TO_OPERATOR',
    'POPLA_APPEAL',
    'IAS_APPEAL',
  ];

  const statusBreakdown = [
    {
      name: 'Pending',
      value: tickets.filter((t) => pendingStatuses.includes(t.status)).length,
      color: '#222222',
    },
    {
      name: 'Won',
      value: tickets.filter((t) => wonStatuses.includes(t.status)).length,
      color: '#1ABC9C',
    },
    {
      name: 'Lost',
      value: tickets.filter((t) => lostStatuses.includes(t.status)).length,
      color: '#B0B0B0',
    },
    {
      name: 'Paid',
      value: tickets.filter((t) => t.status === 'PAID').length,
      color: '#E5E5E5',
    },
  ];

  // Calculate financial impact
  const savedAmount =
    tickets
      .filter((t) => wonStatuses.includes(t.status))
      .reduce((sum, t) => sum + t.initialAmount, 0) / 100;
  const paidAmount =
    tickets
      .filter((t) => t.status === 'PAID')
      .reduce((sum, t) => sum + t.initialAmount, 0) / 100;

  const financialData = [
    { name: 'Saved', value: savedAmount, color: '#222222' },
    { name: 'Paid', value: paidAmount, color: '#E5E5E5' },
  ];

  // Calculate success rate
  const appealsTotal = tickets.filter((t) =>
    [...wonStatuses, ...lostStatuses].includes(t.status),
  ).length;
  const appealsWon = tickets.filter((t) =>
    wonStatuses.includes(t.status),
  ).length;
  const currentSuccessRate =
    appealsTotal > 0 ? Math.round((appealsWon / appealsTotal) * 100) : 0;

  return (
    <AnalyticsCharts
      statusBreakdown={statusBreakdown}
      financialData={financialData}
      totalTicketsThisYear={tickets.length}
      appealsSubmitted={appealsTotal}
      currentSuccessRate={currentSuccessRate}
      successRateChange={12} // Hardcoded for now
    />
  );
};

const DashboardPage = async () => {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const hasPhoneNumber = !!user?.phoneNumber;
  const pendingTickets = await getPendingTickets();

  return (
    <div className="min-h-screen bg-light">
      <PageViewTracker eventName={TRACKING_EVENTS.DASHBOARD_VIEWED} />
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark md:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-gray">
              Welcome back,{' '}
              <span className="font-medium text-dark">{firstName}</span>
            </p>
            <p className="text-sm text-gray">
              Here&apos;s what&apos;s happening with your tickets
            </p>
          </div>
          <Link href="/new">
            <Button className="h-11 gap-2 bg-teal text-white hover:bg-teal-dark">
              <FontAwesomeIcon icon={faPlus} />
              Upload New Ticket
            </Button>
          </Link>
        </div>

        {/* Pending Tickets Banner - show if user has unclaimed tickets */}
        {pendingTickets.length > 0 && (
          <div className="mt-6">
            <PendingTicketsBanner pendingTickets={pendingTickets} />
          </div>
        )}

        {/* Urgent Alerts */}
        <div className="mt-6">
          <Suspense
            fallback={<div className="h-8 animate-pulse rounded-xl bg-white" />}
          >
            <UrgentAlertsWrapper />
          </Suspense>
        </div>

        {/* Phone Prompt Card - show if user doesn't have a phone number */}
        {!hasPhoneNumber && (
          <div className="mt-4">
            <PhonePromptCard />
          </div>
        )}

        {/* Stats Cards */}
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-2xl bg-white"
                  />
                ))}
              </div>
            }
          >
            <StatsCardsWrapper />
          </Suspense>
        </div>

        {/* Tickets & Map Section */}
        <div className="mt-8">
          <Suspense
            fallback={
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                <div className="h-[600px] animate-pulse rounded-2xl bg-white" />
                <div className="h-[600px] animate-pulse rounded-2xl bg-white" />
              </div>
            }
          >
            <DashboardTicketsSection />
          </Suspense>
        </div>

        {/* Analytics Section */}
        <div className="mt-10">
          <Suspense
            fallback={
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-2xl bg-white"
                  />
                ))}
              </div>
            }
          >
            <AnalyticsChartsWrapper />
          </Suspense>
        </div>

        {/* Quick Actions */}
        <div className="mt-10">
          <Suspense
            fallback={
              <div className="h-24 animate-pulse rounded-xl bg-white" />
            }
          >
            <QuickActionsWrapper />
          </Suspense>
        </div>

        {/* Activity Timeline */}
        <div className="mt-10 pb-10">
          <Suspense
            fallback={
              <div className="h-[400px] animate-pulse rounded-2xl bg-white" />
            }
          >
            <ActivityTimelineWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
