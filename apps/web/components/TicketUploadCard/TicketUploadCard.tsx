'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

type TicketUploadCardProps = {
  onPhotoUpload: (file: File) => void;
  onManualEntry: () => void;
  isUploading?: boolean;
};

const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 120, delay: 0.4 },
  },
};

const TicketUploadCard = ({
  onPhotoUpload,
  onManualEntry,
  isUploading = false,
}: TicketUploadCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onPhotoUpload(file);
      }
    },
    [onPhotoUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (
        file &&
        (file.type.startsWith('image/') || file.type === 'application/pdf')
      ) {
        onPhotoUpload(file);
      }
    },
    [onPhotoUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      variants={slideFromRight}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md lg:w-[400px]"
    >
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
        <h3 className="text-lg font-bold text-dark">Get started in seconds</h3>

        {/* Upload Area */}
        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onClick={handleUploadClick}
            onKeyDown={(e) => e.key === 'Enter' && handleUploadClick()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
              isDragging
                ? 'border-teal bg-teal/10'
                : 'border-gray/30 bg-light/50 hover:border-teal/50'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon icon={faCamera} className="text-2xl text-teal" />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-dark">
              {isDragging ? 'Drop your ticket here' : 'Drop your ticket here'}
            </p>
            <p className="mt-1 text-center text-xs text-gray">
              JPG, PNG, or PDF
            </p>
            <Button
              className="mt-4 bg-teal text-white hover:bg-teal-dark"
              disabled={isUploading}
            >
              {isUploading ? 'Processing...' : 'Upload Ticket'}
            </Button>
          </div>

          {/* Manual Entry Link */}
          <button
            type="button"
            onClick={onManualEntry}
            className="mt-4 w-full text-center text-sm font-medium text-teal hover:underline"
            disabled={isUploading}
          >
            Don&apos;t have a photo? Enter details manually
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray">
          Free to upload. No credit card required.
        </p>
      </div>
    </motion.div>
  );
};

export default TicketUploadCard;
