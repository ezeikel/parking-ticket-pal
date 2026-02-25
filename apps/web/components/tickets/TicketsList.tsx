'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot,
  faSterlingSign,
  faCar,
  faClock,
  faCalendar,
  faUnlock,
  faLock,
  faPlus,
  faSearch,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ScoreGauge from '@/components/ui/ScoreGauge';
import ChallengeOptionsDialog from '@/components/ticket-detail/ChallengeOptionsDialog';
import type {
  Prisma,
  TicketStatus,
  TicketTier,
  IssuerType,
} from '@parking-ticket-pal/db/types';
import { getDisplayAmount } from '@/utils/getCurrentAmountDue';

const getDeadlineIconColor = (days: number) => {
  if (days <= 0) return 'text-coral';
  if (days <= 7) return 'text-amber';
  return 'text-gray';
};

const getDeadlineTextColor = (days: number) => {
  if (days <= 0) return 'font-semibold text-coral';
  if (days <= 7) return 'font-semibold text-amber';
  return 'text-gray';
};

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    vehicle: true;
    prediction: true;
    amountIncreases: {
      select: {
        amount: true;
        effectiveAt: true;
      };
    };
  };
}>;

type TicketsListProps = {
  tickets: TicketWithRelations[];
  onTicketHover?: (ticketId: string | null) => void;
  hoveredTicketId?: string | null;
};

/**
 * Check if the score should be locked for a ticket.
 * Score is unlocked if the ticket tier is PREMIUM.
 */
const isScoreLocked = (ticketTier: TicketTier): boolean =>
  ticketTier !== 'PREMIUM';

/**
 * Check if user can challenge a ticket.
 * Challenge is unlocked if the ticket tier is PREMIUM.
 */
const canChallenge = (ticketTier: TicketTier): boolean =>
  ticketTier === 'PREMIUM';

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  ISSUED_DISCOUNT_PERIOD: {
    label: 'Needs Action',
    bg: 'bg-amber/10',
    text: 'text-amber',
  },
  ISSUED_FULL_CHARGE: {
    label: 'Needs Action',
    bg: 'bg-amber/10',
    text: 'text-amber',
  },
  NOTICE_TO_OWNER: {
    label: 'Needs Action',
    bg: 'bg-amber/10',
    text: 'text-amber',
  },
  NOTICE_TO_KEEPER: {
    label: 'Needs Action',
    bg: 'bg-amber/10',
    text: 'text-amber',
  },
  FORMAL_REPRESENTATION: {
    label: 'Pending',
    bg: 'bg-teal/10',
    text: 'text-teal',
  },
  APPEAL_SUBMITTED_TO_OPERATOR: {
    label: 'Pending',
    bg: 'bg-teal/10',
    text: 'text-teal',
  },
  POPLA_APPEAL: { label: 'Pending', bg: 'bg-teal/10', text: 'text-teal' },
  IAS_APPEAL: { label: 'Pending', bg: 'bg-teal/10', text: 'text-teal' },
  APPEAL_TO_TRIBUNAL: {
    label: 'Pending',
    bg: 'bg-teal/10',
    text: 'text-teal',
  },
  REPRESENTATION_ACCEPTED: {
    label: 'Won',
    bg: 'bg-success/10',
    text: 'text-success',
  },
  APPEAL_UPHELD: { label: 'Won', bg: 'bg-success/10', text: 'text-success' },
  NOTICE_OF_REJECTION: {
    label: 'Lost',
    bg: 'bg-coral/10',
    text: 'text-coral',
  },
  APPEAL_REJECTED_BY_OPERATOR: {
    label: 'Lost',
    bg: 'bg-coral/10',
    text: 'text-coral',
  },
  APPEAL_REJECTED: { label: 'Lost', bg: 'bg-coral/10', text: 'text-coral' },
  CHARGE_CERTIFICATE: {
    label: 'Overdue',
    bg: 'bg-coral/10',
    text: 'text-coral',
  },
  ORDER_FOR_RECOVERY: {
    label: 'Overdue',
    bg: 'bg-coral/10',
    text: 'text-coral',
  },
  ENFORCEMENT_BAILIFF_STAGE: {
    label: 'Overdue',
    bg: 'bg-coral/10',
    text: 'text-coral',
  },
  DEBT_COLLECTION: {
    label: 'Overdue',
    bg: 'bg-coral/10',
    text: 'text-coral',
  },
  PAID: { label: 'Paid', bg: 'bg-light', text: 'text-gray' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-light', text: 'text-gray' },
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB')}`;

const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getDeadlineDays = (issuedAt: Date | string): number => {
  const issued = new Date(issuedAt);
  const deadline = new Date(issued);
  deadline.setDate(deadline.getDate() + 14);
  const now = new Date();
  return Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const needsAction = (status: TicketStatus): boolean => {
  const actionStatuses: TicketStatus[] = [
    'ISSUED_DISCOUNT_PERIOD',
    'ISSUED_FULL_CHARGE',
    'NOTICE_TO_OWNER',
    'NOTICE_TO_KEEPER',
    'NOTICE_OF_REJECTION',
  ];
  return actionStatuses.includes(status);
};

/**
 * Terminal statuses where success score and deadline are not relevant
 */
const isTerminalStatus = (status: TicketStatus) =>
  ['CANCELLED', 'PAID', 'REPRESENTATION_ACCEPTED', 'APPEAL_UPHELD'].includes(
    status,
  );

const TicketsList = ({
  tickets,
  onTicketHover,
  hoveredTicketId,
}: TicketsListProps) => {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [challengeTicket, setChallengeTicket] = useState<{
    id: string;
    issuer: string;
    issuerType: IssuerType;
  } | null>(null);

  const filteredTickets = tickets
    .filter((ticket) => {
      if (filter === 'all') return true;
      if (filter === 'needs_action') return needsAction(ticket.status);
      if (filter === 'pending')
        return [
          'FORMAL_REPRESENTATION',
          'APPEAL_SUBMITTED_TO_OPERATOR',
          'POPLA_APPEAL',
          'IAS_APPEAL',
          'APPEAL_TO_TRIBUNAL',
        ].includes(ticket.status);
      if (filter === 'won')
        return ['REPRESENTATION_ACCEPTED', 'APPEAL_UPHELD'].includes(
          ticket.status,
        );
      if (filter === 'lost')
        return [
          'NOTICE_OF_REJECTION',
          'APPEAL_REJECTED_BY_OPERATOR',
          'APPEAL_REJECTED',
        ].includes(ticket.status);
      if (filter === 'paid') return ticket.status === 'PAID';
      return true;
    })
    .filter((ticket) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        ticket.pcnNumber.toLowerCase().includes(searchLower) ||
        ticket.vehicle?.registrationNumber
          ?.toLowerCase()
          .includes(searchLower) ||
        ticket.issuer?.toLowerCase().includes(searchLower)
      );
    });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sort === 'newest')
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    if (sort === 'deadline')
      return getDeadlineDays(a.issuedAt) - getDeadlineDays(b.issuedAt);
    if (sort === 'amount') return b.initialAmount - a.initialAmount;
    return 0;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-white px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-dark">Your Tickets</h1>
          <Link href="/new">
            <Button className="gap-2 bg-teal text-white hover:bg-teal-dark">
              <FontAwesomeIcon icon={faPlus} />
              Upload Ticket
            </Button>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray"
            />
            <Input
              placeholder="Search reference or vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="needs_action">Needs Action</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="deadline">Due Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {sortedTickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon icon={faCar} className="text-3xl text-teal" />
            </div>
            <h3 className="text-lg font-semibold text-dark">
              No tickets found
            </h3>
            <p className="mt-1 max-w-xs text-sm text-gray">
              {search || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first parking ticket to see it here'}
            </p>
            {!search && filter === 'all' && (
              <Link href="/new">
                <Button className="mt-6 gap-2 bg-teal text-white hover:bg-teal-dark">
                  <FontAwesomeIcon icon={faPlus} />
                  Upload Ticket
                </Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedTickets.map((ticket, index) => {
              const status = statusConfig[ticket.status] || {
                label: ticket.status,
                bg: 'bg-light',
                text: 'text-gray',
              };
              const isHovered = hoveredTicketId === ticket.id;
              const deadlineDays = getDeadlineDays(ticket.issuedAt);
              const location = ticket.location as {
                line1?: string;
              } | null;
              const scoreLocked = isScoreLocked(ticket.tier);

              return (
                <motion.a
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onHoverStart={() => onTicketHover?.(ticket.id)}
                  onHoverEnd={() => onTicketHover?.(null)}
                  className={`block cursor-pointer rounded-xl border bg-white p-4 transition-all ${
                    isHovered
                      ? 'border-teal shadow-lg'
                      : 'border-border hover:border-teal/50 hover:shadow-md'
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-light text-sm font-bold text-gray">
                        {ticket.issuer?.substring(0, 2).toUpperCase() || 'XX'}
                      </div>
                      <div>
                        <p className="text-base font-bold text-dark">
                          {ticket.pcnNumber}
                        </p>
                        <p className="text-sm text-gray">
                          {ticket.issuer || 'Unknown Issuer'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray">
                      <FontAwesomeIcon
                        icon={faLocationDot}
                        className="w-4 text-center text-xs"
                      />
                      <span className="truncate">
                        {location?.line1 || 'Unknown location'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={faSterlingSign}
                        className="w-4 text-center text-xs text-gray"
                      />
                      <span className="font-semibold text-dark">
                        {formatAmount(getDisplayAmount(ticket))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray">
                      <FontAwesomeIcon
                        icon={faCar}
                        className="w-4 text-center text-xs"
                      />
                      <span className="inline-flex items-center rounded bg-yellow px-1.5 py-0.5 font-plate text-xs font-bold tracking-wide text-dark">
                        {ticket.vehicle?.registrationNumber || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray">
                      <FontAwesomeIcon
                        icon={faCalendar}
                        className="w-4 text-center text-xs"
                      />
                      <span>{formatDate(ticket.issuedAt)}</span>
                    </div>
                  </div>

                  {/* Deadline Warning - hidden for terminal statuses */}
                  {deadlineDays <= 14 && !isTerminalStatus(ticket.status) && (
                    <div className="mt-3 flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={faClock}
                        className={`text-xs ${getDeadlineIconColor(deadlineDays)}`}
                      />
                      <span
                        className={`text-sm ${getDeadlineTextColor(
                          deadlineDays,
                        )}`}
                      >
                        {deadlineDays <= 0
                          ? 'Overdue'
                          : `Due in ${deadlineDays} days`}
                      </span>
                    </div>
                  )}

                  {/* Bottom Row - Score and Actions - hide for terminal statuses with no action needed */}
                  {(!isTerminalStatus(ticket.status) ||
                    needsAction(ticket.status)) && (
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      {/* Score - hidden for terminal statuses */}
                      {!isTerminalStatus(ticket.status) ? (
                        <div className="flex items-center gap-2">
                          <ScoreGauge
                            score={ticket.prediction?.percentage ?? 50}
                            size="sm"
                            showLabel={false}
                            animated
                            delay={index * 0.03 + 0.1}
                            locked={scoreLocked}
                          />
                          {!scoreLocked ? (
                            <span className="text-xs text-gray">
                              Success chance
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // TODO: Open upgrade modal
                              }}
                              className="flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal/20"
                            >
                              <FontAwesomeIcon
                                icon={faUnlock}
                                className="text-[10px]"
                              />
                              Unlock score
                            </button>
                          )}
                        </div>
                      ) : (
                        <div />
                      )}

                      {needsAction(ticket.status) &&
                        (() => {
                          const canChallengeTicket = canChallenge(ticket.tier);
                          return canChallengeTicket ? (
                            <Button
                              size="sm"
                              className="bg-teal text-white hover:bg-teal-dark"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setChallengeTicket({
                                  id: ticket.id,
                                  issuer: ticket.issuer,
                                  issuerType: ticket.issuerType,
                                });
                              }}
                            >
                              Challenge Now
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="gap-2 bg-teal text-white hover:bg-teal-dark"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/tickets/${ticket.id}`;
                              }}
                            >
                              <FontAwesomeIcon
                                icon={faLock}
                                className="text-xs"
                              />
                              Upgrade to Challenge
                            </Button>
                          );
                        })()}
                    </div>
                  )}
                </motion.a>
              );
            })}

            {/* List Footer */}
            <div className="mt-4 text-center text-sm text-gray">
              Showing {sortedTickets.length} of {tickets.length} tickets
            </div>
          </div>
        )}
      </div>

      {/* Challenge Dialog */}
      {challengeTicket && (
        <ChallengeOptionsDialog
          open={!!challengeTicket}
          onOpenChange={(open) => !open && setChallengeTicket(null)}
          ticketId={challengeTicket.id}
          issuerName={challengeTicket.issuer}
          issuerType={challengeTicket.issuerType}
        />
      )}
    </div>
  );
};

export default TicketsList;
