'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/pro-regular-svg-icons';
import TicketCard from '@/components/TicketCard/TicketCard';
import type { Prisma } from '@prisma/client';
import ViewToggle from '@/components/ViewToggle/ViewToggle';
import MapView from '@/components/MapView/MapView';
import EmptyList from '@/components/EmptyList/EmptyList';

type ViewType = 'list' | 'map';

type TicketsContainerProps = {
  tickets: Prisma.TicketGetPayload<{
    include: {
      vehicle: true;
    };
  }>[];
};

const TicketsContainer = ({ tickets }: TicketsContainerProps) => {
  const [activeView, setActiveView] = useState<ViewType>('list');

  if (!tickets?.length) {
    return (
      <EmptyList
        title="No tickets yet"
        description="You haven't added any tickets yet. Add your first ticket to get started."
        buttonText="Add your first ticket"
        buttonLink="/new"
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Tickets</h1>
        <div className="flex items-center gap-4">
          <ViewToggle activeView={activeView} onChange={setActiveView} />
          <Link href="/new">
            <Button className="flex items-center gap-2">
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              <span>Add Ticket</span>
            </Button>
          </Link>
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <MapView tickets={tickets} />
      )}
    </>
  );
};

export default TicketsContainer;
