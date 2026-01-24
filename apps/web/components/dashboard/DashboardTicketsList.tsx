'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot,
  faSterlingSign,
  faCalendar,
  faClock,
  faUnlock,
  faLock,
} from '@fortawesome/pro-solid-svg-icons';
import { TicketTier, SubscriptionType } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ScoreGauge from '@/components/ui/ScoreGauge';

type TicketStatus =
  | 'NEEDS_ACTION'
  | 'PENDING_APPEAL'
  | 'WON'
  | 'LOST'
  | 'PAID'
  | 'OVERDUE';

type Ticket = {
  id: string;
  pcnNumber: string;
  issuer: string;
  status: TicketStatus;
  amount: number;
  location: string;
  issuedAt: string;
  deadlineDays: number;
  successPrediction?: number;
  vehicleReg?: string;
  tier: TicketTier;
};

type DashboardTicketsListProps = {
  tickets: Ticket[];
  onTicketHover?: (ticketId: string | null) => void;
  hoveredTicketId?: string | null;
  hasSubscription?: boolean;
  subscriptionType?: SubscriptionType | null;
};

/**
 * Check if the score should be locked for a ticket.
 * Score is unlocked if:
 * - The ticket tier is STANDARD or PREMIUM, OR
 * - The user has an active subscription (STANDARD or PREMIUM)
 */
const isScoreLocked = (ticketTier: TicketTier, hasSubscription: boolean): boolean => {
  // Unlocked if ticket is STANDARD or PREMIUM tier
  if (ticketTier === 'STANDARD' || ticketTier === 'PREMIUM') {
    return false;
  }
  // Unlocked if user has subscription
  if (hasSubscription) {
    return false;
  }
  // Otherwise locked (FREE tier without subscription)
  return true;
};

/**
 * Check if user can challenge a ticket.
 * Challenge is unlocked if:
 * - The ticket tier is PREMIUM, OR
 * - The user has a PREMIUM subscription
 */
const canChallenge = (
  ticketTier: TicketTier,
  subscriptionType: SubscriptionType | null,
): boolean => {
  // Can challenge if ticket is PREMIUM tier
  if (ticketTier === 'PREMIUM') {
    return true;
  }
  // Can challenge if user has PREMIUM subscription
  if (subscriptionType === 'PREMIUM') {
    return true;
  }
  // Otherwise cannot challenge
  return false;
};

const statusConfig: Record<TicketStatus, { label: string; bg: string; text: string }> = {
  NEEDS_ACTION: { label: 'Needs Action', bg: 'bg-amber/10', text: 'text-amber' },
  PENDING_APPEAL: { label: 'Pending', bg: 'bg-teal/10', text: 'text-teal' },
  WON: { label: 'Won', bg: 'bg-teal/10', text: 'text-teal' },
  LOST: { label: 'Lost', bg: 'bg-coral/10', text: 'text-coral' },
  PAID: { label: 'Paid', bg: 'bg-light', text: 'text-gray' },
  OVERDUE: { label: 'Overdue', bg: 'bg-coral/10', text: 'text-coral' },
};

const formatAmount = (pence: number) => `£${(pence / 100).toLocaleString('en-GB')}`;

const DashboardTicketsList = ({
  tickets,
  onTicketHover,
  hoveredTicketId,
  hasSubscription = false,
  subscriptionType = null,
}: DashboardTicketsListProps) => {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === 'all') return true;
    if (filter === 'needs_action') return ticket.status === 'NEEDS_ACTION';
    if (filter === 'pending') return ticket.status === 'PENDING_APPEAL';
    if (filter === 'won') return ticket.status === 'WON';
    if (filter === 'paid') return ticket.status === 'PAID';
    return true;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sort === 'newest')
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    if (sort === 'deadline') return a.deadlineDays - b.deadlineDays;
    if (sort === 'amount') return b.amount - a.amount;
    return 0;
  });

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="hidden text-lg font-semibold text-dark lg:block">Your Tickets</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="needs_action">Needs Action</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="deadline">Deadline Soon</SelectItem>
              <SelectItem value="amount">Amount High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedTickets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <p className="text-gray">No tickets found</p>
            <Link href="/new">
              <Button className="mt-4 bg-teal text-white hover:bg-teal-dark">
                Upload Your First Ticket
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedTickets.map((ticket, index) => {
              const status = statusConfig[ticket.status] || statusConfig.NEEDS_ACTION;
              const isHovered = hoveredTicketId === ticket.id;

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onHoverStart={() => onTicketHover?.(ticket.id)}
                  onHoverEnd={() => onTicketHover?.(null)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isHovered
                      ? 'border-teal bg-teal/5 shadow-lg'
                      : 'border-border hover:border-teal/50 hover:shadow-md'
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light text-sm font-bold text-gray">
                        {ticket.issuer.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold text-dark">
                          {ticket.pcnNumber}
                        </p>
                        <p className="text-xs text-gray">{ticket.issuer}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-gray">
                      <FontAwesomeIcon icon={faLocationDot} className="text-xs" />
                      <span className="truncate">{ticket.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray">
                      <FontAwesomeIcon icon={faSterlingSign} className="text-xs" />
                      <span className="font-medium text-dark">
                        {formatAmount(ticket.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray">
                      <FontAwesomeIcon icon={faCalendar} className="text-xs" />
                      <span>
                        {new Date(ticket.issuedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon
                        icon={faClock}
                        className={`text-xs ${
                          ticket.deadlineDays <= 0
                            ? 'text-coral'
                            : ticket.deadlineDays <= 7
                              ? 'text-amber'
                              : 'text-gray'
                        }`}
                      />
                      <span
                        className={
                          ticket.deadlineDays <= 0
                            ? 'font-medium text-coral'
                            : ticket.deadlineDays <= 7
                              ? 'font-medium text-amber'
                              : 'text-gray'
                        }
                      >
                        {ticket.deadlineDays <= 0
                          ? 'Overdue'
                          : `Due in ${ticket.deadlineDays} days`}
                      </span>
                    </div>
                  </div>

                  {/* Success Prediction */}
                  {ticket.successPrediction !== undefined && (() => {
                    const scoreLocked = isScoreLocked(ticket.tier, hasSubscription);
                    return (
                      <div className="mt-3 flex items-center justify-between">
                        <ScoreGauge
                          score={ticket.successPrediction}
                          size="sm"
                          showLabel={false}
                          animated
                          delay={index * 0.05 + 0.2}
                          locked={scoreLocked}
                        />
                        {!scoreLocked ? (
                          <span className="text-xs text-gray">Success Prediction</span>
                        ) : (
                          <Link
                            href={`/tickets/${ticket.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal/20"
                          >
                            <FontAwesomeIcon icon={faUnlock} className="text-[10px]" />
                            Unlock score
                          </Link>
                        )}
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    {ticket.status === 'NEEDS_ACTION' && (() => {
                      const canChallengeTicket = canChallenge(ticket.tier, subscriptionType);
                      return canChallengeTicket ? (
                        <Link href={`/tickets/${ticket.id}/challenge`} className="flex-1">
                          <Button
                            size="sm"
                            className="w-full bg-teal text-white hover:bg-teal-dark"
                          >
                            Challenge Now
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/tickets/${ticket.id}`} className="flex-1">
                          <Button
                            size="sm"
                            className="w-full gap-2 bg-teal text-white hover:bg-teal-dark"
                          >
                            <FontAwesomeIcon icon={faLock} className="text-xs" />
                            Upgrade to Challenge
                          </Button>
                        </Link>
                      );
                    })()}
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className={ticket.status === 'NEEDS_ACTION' ? '' : 'flex-1'}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className={`bg-transparent ${
                          ticket.status !== 'NEEDS_ACTION' ? 'w-full' : ''
                        }`}
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTicketsList;
