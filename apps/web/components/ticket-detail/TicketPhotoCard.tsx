'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faExpand,
  faCamera,
  faUpload,
} from '@fortawesome/pro-solid-svg-icons';
import type { Media } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type TicketPhotoCardProps = {
  images: Pick<Media, 'id' | 'url' | 'description'>[];
  onImageClick?: (imageUrl: string) => void;
  onReplace?: () => void;
  onUpload?: () => void;
};

const TicketPhotoCard = ({
  images,
  onImageClick,
  onReplace,
  onUpload,
}: TicketPhotoCardProps) => {
  const primaryImage = images[0];
  const hasImage = !!primaryImage?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">Ticket Photo</h2>
        {hasImage && onReplace && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray hover:text-dark"
            onClick={onReplace}
          >
            <FontAwesomeIcon icon={faPen} className="mr-1.5" />
            Replace
          </Button>
        )}
      </div>

      {hasImage ? (
        <button
          type="button"
          onClick={() => onImageClick?.(primaryImage.url!)}
          className="group relative mt-4 w-full overflow-hidden rounded-lg"
        >
          <div className="aspect-[4/3] bg-light">
            <img
              src={primaryImage.url!}
              alt={primaryImage.description || 'Ticket photo'}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-dark/0 transition-colors group-hover:bg-dark/40">
            <FontAwesomeIcon
              icon={faExpand}
              className="text-xl text-white opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
        </button>
      ) : (
        <div className="mt-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-light/50 py-10 transition-colors hover:border-teal"
            onClick={onUpload}
            onKeyDown={(e) => e.key === 'Enter' && onUpload?.()}
            role="button"
            tabIndex={0}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon icon={faCamera} className="text-xl text-teal" />
            </div>
            <p className="mt-3 font-semibold text-dark">
              Add a photo of your ticket
            </p>
            <p className="mt-1 text-sm text-gray">
              This helps us extract details and verify information
            </p>
            <Button
              className="mt-4 bg-teal text-white hover:bg-teal-dark"
              onClick={(e) => {
                e.stopPropagation();
                onUpload?.();
              }}
            >
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Upload Photo
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-gray">
            Supported formats: JPG, PNG, HEIC. Max size 10MB.
          </p>
        </div>
      )}

      {/* Show additional images as thumbnails if more than one */}
      {images.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {images.slice(1).map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onImageClick?.(image.url!)}
              className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-light"
            >
              <img
                src={image.url!}
                alt={image.description || `Ticket photo ${index + 2}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-dark/0 transition-colors group-hover:bg-dark/40">
                <FontAwesomeIcon
                  icon={faExpand}
                  className="text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TicketPhotoCard;
