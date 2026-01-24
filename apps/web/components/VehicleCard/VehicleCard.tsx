'use client';

import { motion } from 'framer-motion';
import { Prisma } from '@parking-ticket-pal/db/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar } from '@fortawesome/pro-solid-svg-icons';
import VehicleCardControls from '@/components/VehicleCardControls/VehicleCardControls';

type VehicleCardProps = {
  vehicle: Prisma.VehicleGetPayload<{
    select: {
      id: true;
      registrationNumber: true;
      make: true;
      model: true;
      year: true;
      color: true;
      tickets: {
        select: {
          id: true;
          status: true;
        };
      };
    };
  }> & {
    activeTickets: number;
    hasUrgentTickets: boolean;
    urgentTicketCount?: number;
  };
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -100, transition: { duration: 0.2 } },
};

const VehicleCard = ({ vehicle }: VehicleCardProps) => {
  const vehicleName = vehicle.make && vehicle.model
    ? `${vehicle.make} ${vehicle.model}`
    : 'Unknown Vehicle';

  const ticketText = vehicle.activeTickets === 0
    ? 'No active tickets'
    : vehicle.activeTickets === 1
      ? '1 active ticket'
      : `${vehicle.activeTickets} active tickets`;

  return (
    <motion.a
      href={`/tickets?vehicle=${encodeURIComponent(vehicle.registrationNumber)}`}
      variants={cardVariants}
      exit="exit"
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative block cursor-pointer"
    >
      {/* Car illustration area */}
      <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="absolute inset-0 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faCar}
            className="text-5xl text-dark/10 transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Urgent badge */}
        {vehicle.hasUrgentTickets && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-coral px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {vehicle.urgentTicketCount || 1} urgent
          </div>
        )}

        {/* Three-dot menu */}
        <div
          className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.preventDefault()}
        >
          <VehicleCardControls vehicle={vehicle} />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1">
        {/* Registration plate */}
        <div className="inline-flex items-center rounded bg-yellow px-2 py-0.5">
          <span className="font-plate text-sm font-bold tracking-wide text-dark">
            {vehicle.registrationNumber}
          </span>
        </div>

        {/* Vehicle name */}
        <h3 className="font-semibold text-dark">
          {vehicleName}
          {vehicle.year && (
            <span className="font-normal text-gray"> ({vehicle.year})</span>
          )}
        </h3>

        {/* Ticket count */}
        <p className="text-sm text-gray">{ticketText}</p>
      </div>
    </motion.a>
  );
};

export default VehicleCard;
