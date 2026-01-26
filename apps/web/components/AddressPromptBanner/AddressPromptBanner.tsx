'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot,
  faXmark,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

type AddressPromptBannerProps = {
  className?: string;
};

const AddressPromptBanner = ({ className = '' }: AddressPromptBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`rounded-xl border border-amber/30 bg-amber/5 p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/20">
            <FontAwesomeIcon icon={faLocationDot} className="text-amber" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark">
              Add your address for better letters
            </h3>
            <p className="mt-1 text-sm text-gray">
              Your address will appear on challenge letters, making them look
              more professional and official.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href="/account">
                <Button
                  size="sm"
                  className="gap-2 bg-amber text-white hover:bg-amber/90"
                >
                  Add Address
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="text-gray hover:text-dark"
              >
                Maybe later
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="shrink-0 rounded-full p-1.5 text-gray transition-colors hover:bg-gray/10 hover:text-dark"
            aria-label="Dismiss"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddressPromptBanner;
