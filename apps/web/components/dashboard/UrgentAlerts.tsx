'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Alert = {
  id: string;
  type: 'warning' | 'critical';
  title: string;
  message: string;
  subMessage?: string;
  cta: string;
  href: string;
};

type UrgentAlertsProps = {
  alerts?: Alert[];
};

const UrgentAlerts = ({ alerts = [] }: UrgentAlertsProps) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleAlerts = alerts.filter(
    (alert) => !dismissedIds.includes(alert.id),
  );

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="relative rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setDismissedIds([...dismissedIds, alert.id])}
              className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-gray hover:bg-light"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>

            <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between sm:pr-10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-light">
                  <FontAwesomeIcon icon={faClock} className="text-dark" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark">{alert.message}</h3>
                  {alert.subMessage && (
                    <p className="mt-0.5 text-sm text-gray">
                      {alert.subMessage}
                    </p>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                className="w-fit shrink-0 bg-dark text-white hover:bg-dark/90"
                asChild
              >
                <Link href={alert.href}>{alert.cta}</Link>
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default UrgentAlerts;
