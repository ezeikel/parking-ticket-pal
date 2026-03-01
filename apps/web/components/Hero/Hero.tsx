'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { faBolt, faCamera } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import TicketWizard, {
  type ExtractedData,
  type WizardCompleteData,
} from '@/components/TicketWizard/TicketWizard';
import * as Sentry from '@sentry/nextjs';
import { extractOCRTextWithVision } from '@/app/actions/ocr';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { compressImage } from '@/utils/compressImage';
import { useScrollDepthTracking } from '@/hooks/useScrollDepthTracking';

const R2_ASSETS_URL = 'https://assets.parkingticketpal.com';

const HERO_VIDEOS = [
  `${R2_ASSETS_URL}/static/videos/hero/hero-london-01-box-junction.mp4`,
  `${R2_ASSETS_URL}/static/videos/hero/hero-london-02-double-yellow-warden.mp4`,
  `${R2_ASSETS_URL}/static/videos/hero/hero-london-03-bus-lane.mp4`,
  `${R2_ASSETS_URL}/static/videos/hero/hero-london-04-resident-bay-permit.mp4`,
];

const HERO_IMAGES = [
  '/images/hero-london-01-box-junction.png',
  '/images/hero-london-02-double-yellow-warden.png',
  '/images/hero-london-03-bus-lane.png',
  '/images/hero-london-04-resident-bay-permit.png',
];

const IMAGE_INTERVAL = 5000;
const FADE_DURATION = 1500;

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 120,
      delay: 0.4,
    },
  },
};

const Hero = () => {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | undefined>(
    undefined,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { track } = useAnalytics();

  // Track hero view on mount (only once)
  useEffect(() => {
    if (!hasTrackedView) {
      track(TRACKING_EVENTS.HERO_VIEWED, { source: 'homepage' });
      setHasTrackedView(true);
    }
  }, [hasTrackedView, track]);

  // Track scroll depth on landing page
  useScrollDepthTracking({ pageName: 'homepage' });

  const handleVideoEnded = (index: number) => {
    if (index !== activeVideoIndex) return;

    const nextIndex = (index + 1) % HERO_VIDEOS.length;
    const nextVideo = videoRefs.current[nextIndex];
    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => {});
    }

    setActiveVideoIndex(nextIndex);
  };

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === 0) {
          video.play().catch(() => {});
        } else {
          video.load();
        }
      }
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, IMAGE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      const startTime = Date.now();
      setIsUploading(true);

      // Compress image before upload (skip PDFs, small files)
      let uploadFile = file;
      let wasCompressed = false;
      let compressedFileSize: number | undefined;
      let compressionRatio: number | undefined;

      try {
        const result = await compressImage(file);
        uploadFile = result.file;
        wasCompressed = result.wasCompressed;
        if (wasCompressed) {
          compressedFileSize = result.compressedSize;
          compressionRatio = Math.round(
            (1 - result.compressedSize / result.originalSize) * 100,
          );
        }
      } catch {
        // Compression failed (e.g. HEIC on Chrome) — use original file
      }

      // Hard limit: reject files still over 4MB after compression
      const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;
      if (uploadFile.size > MAX_UPLOAD_SIZE) {
        toast.error('File is too large. Please upload an image under 4MB.');
        setIsUploading(false);
        return;
      }

      // Track upload started
      track(TRACKING_EVENTS.HERO_UPLOAD_STARTED, {
        file_type: file.type,
        file_size: file.size,
        compressed_file_size: compressedFileSize,
        was_compressed: wasCompressed,
        compression_ratio: compressionRatio,
      });

      try {
        const formData = new FormData();
        formData.append('image', uploadFile);

        const result = await extractOCRTextWithVision(formData);

        if (result.success && result.data) {
          // Track upload completed with OCR success
          track(TRACKING_EVENTS.HERO_UPLOAD_COMPLETED, {
            file_type: file.type,
            file_size: file.size,
            duration_ms: Date.now() - startTime,
            ocr_success: true,
            fields_extracted: [
              result.data.pcnNumber ? 'pcnNumber' : null,
              result.data.vehicleReg ? 'vehicleReg' : null,
              result.data.issuer ? 'issuer' : null,
              result.data.initialAmount ? 'initialAmount' : null,
            ].filter(Boolean),
          });

          setExtractedData({
            pcnNumber: result.data.pcnNumber || '',
            vehicleReg: result.data.vehicleReg || '',
            issuerType: 'council',
            ticketStage: 'initial',
            issueDate: result.data.issuedAt
              ? new Date(result.data.issuedAt).toISOString()
              : undefined,
            initialAmount: result.data.initialAmount,
            issuer: result.data.issuer,
            location: result.data.location,
            imageUrl: result.imageUrl,
            tempImagePath: result.tempImagePath,
          });
          setIsWizardOpen(true);
        } else {
          // Track upload completed but OCR failed
          track(TRACKING_EVENTS.HERO_UPLOAD_COMPLETED, {
            file_type: file.type,
            file_size: file.size,
            duration_ms: Date.now() - startTime,
            ocr_success: false,
            ocr_error: result.message || 'Unknown OCR error',
          });

          toast.error(result.message || 'Failed to extract ticket details');
          // Still open wizard for manual entry
          setExtractedData(undefined);
          setIsWizardOpen(true);
        }
      } catch (error) {
        // Track upload failed
        track(TRACKING_EVENTS.HERO_UPLOAD_FAILED, {
          file_type: file.type,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        Sentry.captureException(error, {
          tags: { feature: 'hero_upload' },
          extra: {
            fileType: file.type,
            fileSize: file.size,
            compressedFileSize,
            wasCompressed,
          },
        });

        toast.error('Something went wrong. Please try again.');
        setExtractedData(undefined);
        setIsWizardOpen(true);
      } finally {
        setIsUploading(false);
      }
    },
    [track],
  );

  const handleManualEntry = () => {
    track(TRACKING_EVENTS.HERO_MANUAL_ENTRY_CLICKED, {});
    setExtractedData(undefined);
    setIsWizardOpen(true);
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handlePhotoUpload(file);
      }
    },
    [handlePhotoUpload],
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
        handlePhotoUpload(file);
      }
    },
    [handlePhotoUpload],
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

  const handleWizardComplete = (data: WizardCompleteData) => {
    setIsWizardOpen(false);

    // Store wizard data in localStorage for guest flows
    const guestTicketData = {
      pcnNumber: data.pcnNumber,
      vehicleReg: data.vehicleReg,
      issuerType: data.issuerType,
      ticketStage: data.ticketStage,
      issuer: data.issuer,
      issuedAt: data.issuedAt?.toISOString() ?? null,
      initialAmount: data.initialAmount,
      location: data.location,
      intent: data.intent,
      challengeReason: data.challengeReason,
      tier: data.tier,
      // Include extracted data if available (from OCR)
      imageUrl: data.extractedData?.imageUrl,
      tempImagePath: data.extractedData?.tempImagePath,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('guestTicketData', JSON.stringify(guestTicketData));

    // Branch based on user intent
    if (data.intent === 'track') {
      // Track flow: redirect to signup page where ticket will be created after auth
      window.location.href = '/guest/signup?source=wizard';
    } else {
      // Challenge flow: redirect to checkout with premium tier
      window.location.href = `/checkout?tier=${data.tier}&source=wizard`;
    }
  };

  return (
    <>
      <section className="relative h-[100dvh] w-[calc(100%+2rem)] -mx-4 -mt-[72px] overflow-hidden">
        {/* Desktop Video Background */}
        <div className="absolute inset-0 hidden lg:block bg-black">
          {HERO_VIDEOS.map((src, index) => (
            <video
              key={src}
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
              style={{
                transitionDuration: `${FADE_DURATION}ms`,
                opacity: index === activeVideoIndex ? 1 : 0,
                zIndex: index === activeVideoIndex ? 1 : 0,
              }}
              muted
              playsInline
              preload="auto"
              onEnded={() => handleVideoEnded(index)}
            >
              <source src={src} type="video/mp4" />
            </video>
          ))}
        </div>

        {/* Mobile/Tablet Image Background */}
        <div className="absolute inset-0 lg:hidden bg-black">
          {HERO_IMAGES.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt={`London parking scene ${index + 1}`}
              fill
              priority={index === 0}
              className="object-cover transition-opacity ease-in-out"
              style={{
                transitionDuration: `${FADE_DURATION}ms`,
                opacity: index === currentImageIndex ? 1 : 0,
              }}
            />
          ))}
        </div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50 z-[2]" />

        {/* Content - Two Column Layout */}
        <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1280px] flex-col items-center gap-12 px-6 pt-24 pb-16 lg:flex-row lg:items-center lg:gap-16 lg:pt-0">
          {/* Left Column - Main Messaging */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left"
          >
            {/* Main Headline */}
            <motion.h1
              variants={fadeUpVariants}
              className="text-4xl font-extrabold leading-tight text-white [text-wrap:balance] md:text-5xl lg:text-[56px]"
            >
              That parking ticket doesn&apos;t have to cost you a penny more.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUpVariants}
              className="mt-6 max-w-lg text-lg text-white/90 md:text-xl"
            >
              Most fines jump 50% after just 14 days. Upload your ticket now —
              we&apos;ll track every deadline and show you exactly what to do
              next.
            </motion.p>

            {/* CTA Button - Mobile Only */}
            <motion.div
              variants={fadeUpVariants}
              className="mt-8 flex flex-wrap justify-center gap-4 lg:hidden"
            >
              <Button
                size="lg"
                className="h-12 gap-2 bg-teal px-6 text-base font-semibold text-white hover:bg-teal-dark"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                <FontAwesomeIcon icon={faBolt} className="text-yellow" />
                {isUploading ? 'Processing...' : 'Upload Your Ticket'}
              </Button>
            </motion.div>

            {/* TODO: Add App Store + Google Play buttons back when apps are live */}
          </motion.div>

          {/* Right Column - Upload Card (Desktop) */}
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            animate="visible"
            className="hidden w-full max-w-md lg:block lg:w-[400px]"
          >
            <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
              <h3 className="text-lg font-bold text-dark">
                Get started in seconds
              </h3>

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
                    <FontAwesomeIcon
                      icon={faCamera}
                      className="text-2xl text-teal"
                    />
                  </div>
                  <p className="mt-4 text-center text-sm font-medium text-dark">
                    {isDragging
                      ? 'Drop your ticket here'
                      : 'Upload your ticket photo or PDF'}
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
                  onClick={handleManualEntry}
                  className="mt-4 w-full text-center text-sm font-medium text-teal hover:underline"
                  disabled={isUploading}
                >
                  Don&apos;t have a photo? Enter details manually
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-gray">
                Free to upload and track. No credit card. No commitment.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Wizard Modal */}
      <AnimatePresence>
        {isWizardOpen && (
          <TicketWizard
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            extractedData={extractedData}
            onComplete={handleWizardComplete}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Hero;
