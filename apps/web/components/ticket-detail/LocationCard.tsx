'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faStreetView } from '@fortawesome/pro-solid-svg-icons';
import { Address } from '@parking-ticket-pal/types';
import type { Media } from '@parking-ticket-pal/db/types';
import LocationMap from '@/components/LocationMap/DynamicLocationMap';

type LocationCardProps = {
  location: Address | null;
  streetViewImages?: Pick<Media, 'id' | 'url' | 'description'>[];
  onImageClick?: (url: string) => void;
};

const LocationCard = ({
  location,
  streetViewImages = [],
  onImageClick,
}: LocationCardProps) => {
  const hasCoordinates =
    location?.coordinates?.latitude && location?.coordinates?.longitude;
  const addressDisplay = location?.line1 || 'Unknown location';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <h2 className="text-lg font-semibold text-dark">Ticket Location</h2>

      {hasCoordinates ? (
        <div className="mt-4 h-48 overflow-hidden rounded-lg md:h-56">
          <LocationMap
            latitude={location.coordinates.latitude}
            longitude={location.coordinates.longitude}
          />
        </div>
      ) : (
        <div
          className="mt-4 h-48 rounded-lg bg-[#e8e8e8] md:h-56"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23d1d5db' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          <div className="relative flex h-full items-center justify-center">
            <div className="relative">
              <svg
                width="40"
                height="50"
                viewBox="0 0 36 44"
                fill="none"
                className="drop-shadow-lg"
              >
                <path
                  d="M18 0C8.06 0 0 8.06 0 18c0 12.75 18 26 18 26s18-13.25 18-26C36 8.06 27.94 0 18 0z"
                  fill="#1ABC9C"
                />
                <circle cx="18" cy="18" r="8" fill="white" />
              </svg>
              <FontAwesomeIcon
                icon={faLocationDot}
                className="absolute left-1/2 top-[18px] -translate-x-1/2 -translate-y-1/2 text-sm text-teal"
              />
            </div>
          </div>
        </div>
      )}

      {/* Street View Images */}
      {streetViewImages.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon
              icon={faStreetView}
              className="text-sm text-gray"
            />
            <span className="text-sm font-medium text-dark">Street View</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {streetViewImages.map((img) => (
              <button
                key={img.id}
                type="button"
                className="group relative overflow-hidden rounded-lg"
                onClick={() => onImageClick?.(img.url)}
              >
                <div className="aspect-square bg-light">
                  <img
                    src={img.url}
                    alt={img.description || 'Street view'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-dark/0 transition-colors group-hover:bg-dark/20" />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 flex items-center gap-2 text-sm text-gray">
        <FontAwesomeIcon icon={faLocationDot} />
        {addressDisplay}
      </p>
    </motion.div>
  );
};

export default LocationCard;
