'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinnerThird,
  faXmark,
  faPlus,
  faMinus,
  faExpand,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';

type TicketStatus =
  | 'NEEDS_ACTION'
  | 'PENDING_APPEAL'
  | 'WON'
  | 'PAID'
  | 'OVERDUE';

type MapTicket = {
  id: string;
  pcnNumber: string;
  amount: number;
  deadlineDays: number;
  status: TicketStatus;
  location: string;
  coordinates?: { lat: number; lng: number };
};

type DashboardTicketsMapProps = {
  tickets: MapTicket[];
  hoveredTicketId?: string | null;
  onMarkerHover?: (ticketId: string | null) => void;
};

const statusColors: Record<TicketStatus, string> = {
  NEEDS_ACTION: '#F59E0B',
  PENDING_APPEAL: '#1ABC9C',
  WON: '#00A699',
  PAID: '#64748B',
  OVERDUE: '#FF5A5F',
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB')}`;

const DashboardTicketsMap = ({
  tickets,
  hoveredTicketId,
  onMarkerHover,
}: DashboardTicketsMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<MapTicket | null>(null);
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
      if (!ticket.coordinates?.lat || !ticket.coordinates?.lng) {
        return;
      }

      hasValidCoordinates = true;
      const { lat, lng } = ticket.coordinates;
      bounds.extend([lng, lat]);

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div class="relative">
          <svg width="36" height="44" viewBox="0 0 36 44" fill="none" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
            <path d="M18 0C8.06 0 0 8.06 0 18c0 12.75 18 26 18 26s18-13.25 18-26C36 8.06 27.94 0 18 0z" fill="${statusColors[ticket.status]}" />
            <circle cx="18" cy="18" r="8" fill="white" />
          </svg>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedTicket(ticket);
      });

      el.addEventListener('mouseenter', () => {
        onMarkerHover?.(ticket.id);
        el.style.transform = 'scale(1.2)';
        el.style.transition = 'transform 0.15s ease';
      });

      el.addEventListener('mouseleave', () => {
        onMarkerHover?.(null);
        el.style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
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

  // Update marker scale on hover from list
  useEffect(() => {
    markersRef.current.forEach((marker, index) => {
      const el = marker.getElement();
      const ticket = tickets[index];
      if (ticket && el) {
        if (hoveredTicketId === ticket.id) {
          el.style.transform = 'scale(1.2)';
          el.style.zIndex = '10';
        } else {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        }
      }
    });
  }, [hoveredTicketId, tickets]);

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
      if (ticket.coordinates?.lat && ticket.coordinates?.lng) {
        hasValidCoordinates = true;
        bounds.extend([ticket.coordinates.lng, ticket.coordinates.lat]);
      }
    });

    if (hasValidCoordinates && !bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
      });
    }
  };

  return (
    <div className="relative h-full w-full min-h-[400px] overflow-hidden rounded-2xl bg-light shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
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
            <p className="font-mono text-sm font-semibold text-dark">
              {selectedTicket.pcnNumber}
            </p>
            <p className="mt-1 text-xs text-gray">{selectedTicket.location}</p>
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
              style={{ backgroundColor: statusColors.NEEDS_ACTION }}
            />
            <span className="text-gray">Action</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.PENDING_APPEAL }}
            />
            <span className="text-gray">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.WON }}
            />
            <span className="text-gray">Won</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColors.OVERDUE }}
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

export default DashboardTicketsMap;
