'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMobileAlt,
  faXmark,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

type PhonePromptCardProps = {
  className?: string;
};

const PhonePromptCard = ({ className = '' }: PhonePromptCardProps) => {
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
        className={`relative rounded-xl border border-teal/30 bg-teal/5 p-4 ${className}`}
      >
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray transition-colors hover:bg-gray/10 hover:text-dark"
          aria-label="Dismiss"
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/20">
            <FontAwesomeIcon icon={faMobileAlt} className="text-teal" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark">Get SMS reminders</h3>
            <p className="mt-1 text-sm text-gray">
              Never miss a deadline. Add your phone number to receive text
              reminders before your tickets expire.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href="/account">
                <Button
                  size="sm"
                  className="gap-2 bg-teal text-white hover:bg-teal-dark"
                >
                  Add Phone Number
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PhonePromptCard;
