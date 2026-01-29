'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faPlus,
  faMinus,
  faExpand,
  faArrowRight,
  faSpinnerThird,
} from '@fortawesome/pro-solid-svg-icons';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import type { Prisma, TicketStatus } from '@parking-ticket-pal/db/types';

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

type TicketsMapViewProps = {
  tickets: TicketWithRelations[];
  hoveredTicketId?: string | null;
  onMarkerHover?: (ticketId: string | null) => void;
};

const statusColors: Record<string, string> = {
  ISSUED_DISCOUNT_PERIOD: '#F59E0B',
  ISSUED_FULL_CHARGE: '#F59E0B',
  NOTICE_TO_OWNER: '#1ABC9C',
  NOTICE_TO_KEEPER: '#1ABC9C',
  FORMAL_REPRESENTATION: '#1ABC9C',
  APPEAL_SUBMITTED_TO_OPERATOR: '#1ABC9C',
  POPLA_APPEAL: '#1ABC9C',
  IAS_APPEAL: '#1ABC9C',
  APPEAL_TO_TRIBUNAL: '#1ABC9C',
  REPRESENTATION_ACCEPTED: '#00A699',
  APPEAL_UPHELD: '#00A699',
  NOTICE_OF_REJECTION: '#FF5A5F',
  APPEAL_REJECTED_BY_OPERATOR: '#FF5A5F',
  APPEAL_REJECTED: '#FF5A5F',
  CHARGE_CERTIFICATE: '#FF5A5F',
  ORDER_FOR_RECOVERY: '#FF5A5F',
  ENFORCEMENT_BAILIFF_STAGE: '#64748B',
  DEBT_COLLECTION: '#64748B',
  PAID: '#64748B',
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB')}`;

const getDeadlineDays = (issuedAt: Date | string): number => {
  const issued = new Date(issuedAt);
  const deadline = new Date(issued);
  deadline.setDate(deadline.getDate() + 14);
  const now = new Date();
  return Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getStatusColor = (status: TicketStatus): string =>
  statusColors[status] || '#64748B';

const TicketsMapView = ({
  tickets,
  hoveredTicketId: _hoveredTicketId,
  onMarkerHover,
}: TicketsMapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedTicket, setSelectedTicket] =
    useState<TicketWithRelations | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.118092, 51.509865], // London
      zoom: 10,
    });

    map.on('load', () => {
      setIsMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add markers when tickets change
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoordinates = false;

    tickets.forEach((ticket) => {
      const location = ticket.location as {
        coordinates?: { latitude: number; longitude: number };
        line1?: string;
      } | null;

      if (
        !location?.coordinates?.latitude ||
        !location?.coordinates?.longitude
      ) {
        return;
      }

      hasValidCoordinates = true;
      const { latitude, longitude } = location.coordinates;
      bounds.extend([longitude, latitude]);

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div class="relative cursor-pointer">
          <svg width="36" height="44" viewBox="0 0 36 44" fill="none" class="drop-shadow-lg">
            <path d="M18 0C8.06 0 0 8.06 0 18c0 12.75 18 26 18 26s18-13.25 18-26C36 8.06 27.94 0 18 0z" fill="${getStatusColor(ticket.status)}" />
            <circle cx="18" cy="18" r="8" fill="white" />
          </svg>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedTicket(ticket);
      });

      el.addEventListener('mouseenter', () => {
        onMarkerHover?.(ticket.id);
      });

      el.addEventListener('mouseleave', () => {
        onMarkerHover?.(null);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Fit map to bounds if we have valid coordinates
    if (hasValidCoordinates && !bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
      });
    }
  }, [tickets, isMapLoaded, onMarkerHover]);

  // Handle zoom controls
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleFitBounds = () => {
    if (!mapRef.current) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoordinates = false;

    tickets.forEach((ticket) => {
      const location = ticket.location as {
        coordinates?: { latitude: number; longitude: number };
      } | null;

      if (location?.coordinates?.latitude && location?.coordinates?.longitude) {
        hasValidCoordinates = true;
        bounds.extend([
          location.coordinates.longitude,
          location.coordinates.latitude,
        ]);
      }
    });

    if (hasValidCoordinates && !bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
      });
    }
  };

  const selectedLocation = selectedTicket?.location as {
    line1?: string;
  } | null;
  const selectedDeadlineDays = selectedTicket
    ? getDeadlineDays(selectedTicket.issuedAt)
    : 0;

  return (
    <div className="relative h-full w-full bg-light">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading State */}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-light">
          <div className="flex flex-col items-center gap-2">
            <FontAwesomeIcon
              icon={faSpinnerThird}
              className="text-2xl text-gray animate-spin"
            />
            <span className="text-sm text-gray">Loading map...</span>
          </div>
        </div>
      )}

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
            <p className="text-sm font-semibold text-dark">
              {selectedTicket.pcnNumber}
            </p>
            <p className="mt-1 text-xs text-gray">
              {selectedLocation?.line1 || 'Unknown location'}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold text-dark">
                {formatAmount(selectedTicket.initialAmount)}
              </span>
              <span
                className={`text-sm ${
                  selectedDeadlineDays <= 0
                    ? 'font-medium text-coral'
                    : selectedDeadlineDays <= 7
                      ? 'text-amber'
                      : 'text-gray'
                }`}
              >
                {selectedDeadlineDays <= 0
                  ? 'Overdue'
                  : `Due in ${selectedDeadlineDays} days`}
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
          onClick={handleZoomIn}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-dark shadow-md hover:bg-light"
        >
          <FontAwesomeIcon icon={faPlus} className="text-sm" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-dark shadow-md hover:bg-light"
        >
          <FontAwesomeIcon icon={faMinus} className="text-sm" />
        </button>
        <button
          type="button"
          onClick={handleFitBounds}
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
              style={{ backgroundColor: statusColors.FORMAL_REPRESENTATION }}
            />
            <span className="text-gray">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.REPRESENTATION_ACCEPTED }}
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

export default TicketsMapView;
