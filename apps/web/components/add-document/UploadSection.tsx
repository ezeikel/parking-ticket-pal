'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faKeyboard } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

type UploadSectionProps = {
  onFileSelect: (file: File) => void;
  onManualEntry: () => void;
  isProcessing?: boolean;
};

const UploadSection = ({
  onFileSelect,
  onManualEntry,
  isProcessing = false,
}: UploadSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
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
        onFileSelect(file);
      }
    },
    [onFileSelect],
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="rounded-2xl bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark">Add Your Document</h1>
          <p className="mt-2 text-gray">
            Upload a parking ticket or letter - we&apos;ll extract the details
            automatically
          </p>
        </div>

        {/* Upload Area */}
        <div className="mt-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing}
          />
          <div
            onClick={handleUploadClick}
            onKeyDown={(e) => e.key === 'Enter' && handleUploadClick()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 transition-all ${
              isDragging
                ? 'border-teal bg-teal/10 scale-[1.02]'
                : 'border-gray/30 bg-light/50 hover:border-teal/50 hover:bg-light'
            } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
          >
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-teal/10"
            >
              <FontAwesomeIcon icon={faCamera} className="text-4xl text-teal" />
            </motion.div>
            <p className="mt-6 text-center text-lg font-semibold text-dark">
              {isDragging ? 'Drop it here!' : 'Drop your ticket or letter here'}
            </p>
            <p className="mt-2 text-center text-sm text-gray">
              or click to browse your files
            </p>
            <p className="mt-1 text-center text-xs text-gray/70">
              Supports JPG, PNG, and PDF
            </p>
            <Button
              className="mt-6 h-12 px-8 bg-teal text-white hover:bg-teal-dark"
              disabled={isProcessing}
            >
              Choose File
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-gray">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Manual Entry */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onManualEntry}
            disabled={isProcessing}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-white px-6 py-4 text-dark transition-all hover:border-teal/50 hover:bg-light disabled:opacity-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light">
              <FontAwesomeIcon icon={faKeyboard} className="text-gray" />
            </div>
            <div className="text-left">
              <p className="font-medium">Enter details manually</p>
              <p className="text-sm text-gray">
                Don&apos;t have a photo? No problem
              </p>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray">
          Your data is encrypted and secure. We never share your information.
        </p>
        <p className="mt-1 text-center text-xs text-gray">
          Free to upload. No credit card required.
        </p>
      </div>
    </motion.div>
  );
};

export default UploadSection;
