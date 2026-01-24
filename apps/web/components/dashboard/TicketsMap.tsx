'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faPlus,
  faMinus,
  faExpand,
  faCar,
  faArrowRight,
  faSpinner,
} from '@fortawesome/pro-solid-svg-icons';
import Link from 'next/link';
import type { TicketStatus } from '@parking-ticket-pal/db';

type MapTicket = {
  id: string;
  pcnNumber: string;
  amount: number;
  deadlineDays: number;
  status: TicketStatus;
  location: {
    line1: string;
    coordinates?: { latitude: number; longitude: number };
  };
};

const statusColors: Record<string, string> = {
  ISSUED: '#F59E0B',
  ISSUED_DISCOUNT_PERIOD: '#F59E0B',
  FULL_AMOUNT_DUE: '#F59E0B',
  NOTICE_TO_OWNER: '#1ABC9C',
  NOTICE_OF_REJECTION: '#FF5A5F',
  CHARGE_CERTIFICATE: '#FF5A5F',
  ORDER_FOR_RECOVERY: '#FF5A5F',
  BAILIFF_STAGE: '#64748B',
  PAID: '#64748B',
  APPEAL_WON: '#00A699',
  CANCELLED: '#00A699',
  APPEALING: '#1ABC9C',
  INFORMAL_APPEAL_SUBMITTED: '#1ABC9C',
  INFORMAL_APPEAL_REJECTED: '#FF5A5F',
  FORMAL_APPEAL_SUBMITTED: '#1ABC9C',
  FORMAL_APPEAL_REJECTED: '#FF5A5F',
  TRIBUNAL_APPEAL_SUBMITTED: '#1ABC9C',
  APPEAL_PENDING: '#1ABC9C',
};

type TicketsMapProps = {
  tickets?: MapTicket[];
  hoveredTicketId?: string | null;
  onMarkerHover?: (ticketId: string | null) => void;
};

const TicketsMap = ({
  tickets = [],
  hoveredTicketId,
  onMarkerHover,
}: TicketsMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedTicket, setSelectedTicket] = useState<MapTicket | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Placeholder map - in production would use Mapbox GL JS
  useEffect(() => {
    const timer = setTimeout(() => setIsMapLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatAmount = (pence: number) =>
    `£${(pence / 100).toLocaleString('en-GB')}`;

  const getStatusColor = (status: TicketStatus) =>
    statusColors[status] || '#64748B';

  const isUrgentStatus = (status: TicketStatus) =>
    [
      'ISSUED',
      'ISSUED_DISCOUNT_PERIOD',
      'FULL_AMOUNT_DUE',
      'NOTICE_OF_REJECTION',
      'CHARGE_CERTIFICATE',
      'ORDER_FOR_RECOVERY',
    ].includes(status);

  return (
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-2xl bg-light shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
      {/* Map Placeholder */}
      <div
        ref={mapRef}
        className="absolute inset-0 bg-[#e8e8e8]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23d1d5db' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {/* Loading State */}
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-light">
            <div className="flex flex-col items-center gap-2">
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-2xl text-gray animate-spin"
              />
              <span className="text-sm text-gray">Loading map...</span>
            </div>
          </div>
        )}

        {/* Markers */}
        {isMapLoaded &&
          tickets.map((ticket, index) => {
            const isHovered = hoveredTicketId === ticket.id;
            const isSelected = selectedTicket?.id === ticket.id;
            // Position markers in a grid pattern for demo
            const top = 20 + (index % 2) * 40;
            const left = 20 + Math.floor(index / 2) * 35;

            return (
              <motion.div
                key={ticket.id}
                initial={{ scale: 0, y: -20 }}
                animate={{
                  scale: isHovered || isSelected ? 1.2 : 1,
                  y: 0,
                }}
                transition={{
                  type: 'spring' as const,
                  stiffness: 300,
                  damping: 15,
                  delay: index * 0.1,
                }}
                onClick={() => setSelectedTicket(ticket)}
                onHoverStart={() => onMarkerHover?.(ticket.id)}
                onHoverEnd={() => onMarkerHover?.(null)}
                className="absolute cursor-pointer"
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                {/* Marker Pin */}
                <div className="relative">
                  <svg
                    width="36"
                    height="44"
                    viewBox="0 0 36 44"
                    fill="none"
                    className="drop-shadow-lg"
                  >
                    <path
                      d="M18 0C8.06 0 0 8.06 0 18c0 12.75 18 26 18 26s18-13.25 18-26C36 8.06 27.94 0 18 0z"
                      fill={getStatusColor(ticket.status)}
                    />
                    <circle cx="18" cy="18" r="8" fill="white" />
                  </svg>
                  <FontAwesomeIcon
                    icon={faCar}
                    className="absolute left-1/2 top-[18px] -translate-x-1/2 -translate-y-1/2 text-xs"
                    style={{ color: getStatusColor(ticket.status) }}
                  />
                  {/* Pulse animation for urgent tickets */}
                  {isUrgentStatus(ticket.status) && (
                    <motion.div
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute top-0 left-0 h-9 w-9 rounded-full"
                      style={{ backgroundColor: getStatusColor(ticket.status) }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>

      {/* Selected Ticket Popup */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 rounded-xl bg-white p-4 shadow-lg sm:left-auto sm:right-4 sm:w-64"
          >
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-gray hover:bg-light"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>
            <p className="font-mono text-sm font-semibold text-dark">
              {selectedTicket.pcnNumber}
            </p>
            <p className="mt-1 text-xs text-gray">
              {selectedTicket.location.line1}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold text-dark">
                {formatAmount(selectedTicket.amount)}
              </span>
              <span
                className={`text-sm ${
                  selectedTicket.deadlineDays <= 0
                    ? 'font-medium text-coral'
                    : selectedTicket.deadlineDays <= 7
                      ? 'text-amber'
                      : 'text-gray'
                }`}
              >
                {selectedTicket.deadlineDays <= 0
                  ? 'Overdue'
                  : `Due in ${selectedTicket.deadlineDays} days`}
              </span>
            </div>
            <Link
              href={`/tickets/${selectedTicket.id}`}
              className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-teal hover:underline"
            >
              View Details
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-dark shadow-md hover:bg-light"
        >
          <FontAwesomeIcon icon={faPlus} className="text-sm" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-dark shadow-md hover:bg-light"
        >
          <FontAwesomeIcon icon={faMinus} className="text-sm" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-dark shadow-md hover:bg-light"
        >
          <FontAwesomeIcon icon={faExpand} className="text-sm" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 hidden rounded-lg bg-white/90 px-3 py-2 text-xs shadow-md backdrop-blur-sm sm:block">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.ISSUED_DISCOUNT_PERIOD }}
            />
            <span className="text-gray">Action</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.APPEALING }}
            />
            <span className="text-gray">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.APPEAL_WON }}
            />
            <span className="text-gray">Won</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.CHARGE_CERTIFICATE }}
            />
            <span className="text-gray">Overdue</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {tickets.length === 0 && isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray">No tickets to display on map</p>
        </div>
      )}
    </div>
  );
};

export default TicketsMap;
