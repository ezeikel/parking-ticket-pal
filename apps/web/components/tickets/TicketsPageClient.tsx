'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMap, faXmark } from '@fortawesome/pro-solid-svg-icons';
import EmptyList from '@/components/EmptyList/EmptyList';
import type { Prisma } from '@parking-ticket-pal/db/types';
import TicketsList from './TicketsList';
import TicketsMapView from './TicketsMapView';

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

type TicketsPageClientProps = {
  tickets: TicketWithRelations[];
};

const TicketsPageClient = ({ tickets }: TicketsPageClientProps) => {
  const [hoveredTicketId, setHoveredTicketId] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  if (!tickets?.length) {
    return (
      <div className="flex min-h-screen flex-col bg-light">
        <div className="container mx-auto py-6">
          <EmptyList
            title="No tickets yet"
            description="You haven't added any tickets yet. Add your first ticket to get started."
            buttonText="Add your first ticket"
            buttonLink="/new"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light lg:flex">
      {/* Left Panel - Ticket List (scrollable) */}
      <div className="w-full lg:w-1/2">
        <TicketsList
          tickets={tickets}
          hoveredTicketId={hoveredTicketId}
          onTicketHover={setHoveredTicketId}
        />
      </div>

      {/* Right Panel - Map (Sticky on Desktop) */}
      <div className="hidden lg:block lg:w-1/2">
        <div className="sticky top-[72px] h-[calc(100vh-72px)]">
          <TicketsMapView
            tickets={tickets}
            hoveredTicketId={hoveredTicketId}
            onMarkerHover={setHoveredTicketId}
          />
        </div>
      </div>

      {/* Mobile Map FAB */}
      <button
        type="button"
        onClick={() => setIsMapOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-dark text-white shadow-xl lg:hidden"
      >
        <FontAwesomeIcon icon={faMap} className="text-xl" />
      </button>

      {/* Mobile Map Overlay */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsMapOpen(false)}
              className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
            >
              <FontAwesomeIcon icon={faXmark} className="text-lg" />
            </button>

            <TicketsMapView
              tickets={tickets}
              hoveredTicketId={hoveredTicketId}
              onMarkerHover={setHoveredTicketId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicketsPageClient;
