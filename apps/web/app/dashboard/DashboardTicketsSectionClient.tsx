'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faMap } from '@fortawesome/pro-solid-svg-icons';
import { TicketTier, SubscriptionType, IssuerType } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import {
  DashboardTicketsList,
  DashboardTicketsMap,
} from '@/components/dashboard';

type TicketStatus =
  | 'NEEDS_ACTION'
  | 'PENDING_APPEAL'
  | 'WON'
  | 'LOST'
  | 'PAID'
  | 'CANCELLED'
  | 'OVERDUE';

type Ticket = {
  id: string;
  pcnNumber: string;
  issuer: string;
  issuerType: IssuerType;
  status: TicketStatus;
  amount: number;
  location: string;
  issuedAt: string;
  deadlineDays: number;
  successPrediction?: number;
  vehicleReg?: string;
  tier: TicketTier;
  coordinates?: { lat: number; lng: number };
};

type DashboardTicketsSectionClientProps = {
  tickets: Ticket[];
  hasSubscription?: boolean;
  subscriptionType?: SubscriptionType | null;
};

const DashboardTicketsSectionClient = ({
  tickets,
  hasSubscription = false,
  subscriptionType = null,
}: DashboardTicketsSectionClientProps) => {
  const [hoveredTicketId, setHoveredTicketId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Transform tickets for the map component (filter out LOST and CANCELLED statuses as they're not in map's type)
  const mapTickets = tickets
    .filter(
      (ticket) => ticket.status !== 'LOST' && ticket.status !== 'CANCELLED',
    )
    .map((ticket) => ({
      id: ticket.id,
      pcnNumber: ticket.pcnNumber,
      amount: ticket.amount,
      deadlineDays: ticket.deadlineDays,
      status: ticket.status as
        | 'NEEDS_ACTION'
        | 'PENDING_APPEAL'
        | 'WON'
        | 'PAID'
        | 'OVERDUE',
      location: ticket.location,
      coordinates: ticket.coordinates,
    }));

  return (
    <>
      {/* Mobile Map Toggle */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <h2 className="text-lg font-semibold text-dark">Your Tickets</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap(!showMap)}
          className="gap-2 bg-transparent"
        >
          <FontAwesomeIcon icon={showMap ? faList : faMap} />
          {showMap ? 'Show List' : 'Show Map'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Tickets List - Hidden on mobile when map is shown */}
        <div className={`${showMap ? 'hidden lg:block' : ''}`}>
          <div className="h-[600px]">
            <DashboardTicketsList
              tickets={tickets}
              onTicketHover={setHoveredTicketId}
              hoveredTicketId={hoveredTicketId}
              hasSubscription={hasSubscription}
              subscriptionType={subscriptionType}
            />
          </div>
        </div>

        {/* Map - Hidden on mobile unless toggled */}
        <div className={`${!showMap ? 'hidden lg:block' : ''}`}>
          <div className="h-[600px]">
            <DashboardTicketsMap
              tickets={mapTickets}
              hoveredTicketId={hoveredTicketId}
              onMarkerHover={setHoveredTicketId}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardTicketsSectionClient;
