'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faTicket,
  faCar,
  faFileArrowDown,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import Link from 'next/link';

type QuickAction = {
  icon: IconDefinition;
  title: string;
  subtitle: string;
  href: string;
  primary?: boolean;
};

type DashboardQuickActionsProps = {
  ticketCount?: number;
  vehicleCount?: number;
  documentCount?: number;
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

const DashboardQuickActions = ({
  ticketCount = 0,
  vehicleCount = 0,
  documentCount = 0,
}: DashboardQuickActionsProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const actions: QuickAction[] = [
    {
      icon: faCamera,
      title: 'Upload Ticket',
      subtitle: 'Snap or upload your PCN',
      href: '/new',
      primary: true,
    },
    {
      icon: faTicket,
      title: 'All Tickets',
      subtitle: `${ticketCount} total`,
      href: '/tickets',
    },
    {
      icon: faCar,
      title: 'Vehicles',
      subtitle: `${vehicleCount} registered`,
      href: '/vehicles',
    },
    {
      icon: faFileArrowDown,
      title: 'Letters & Forms',
      subtitle: `${documentCount} documents`,
      href: '/letters',
    },
  ];

  return (
    <div ref={ref} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-dark">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          >
            <Link
              href={action.href}
              className={`group flex min-h-[80px] items-center gap-3 rounded-xl p-4 transition-all ${
                action.primary
                  ? 'bg-teal text-white'
                  : 'border border-border bg-white hover:border-teal/50'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  action.primary ? 'bg-white/20' : 'bg-light'
                }`}
              >
                <FontAwesomeIcon
                  icon={action.icon}
                  className={action.primary ? 'text-white' : 'text-teal'}
                />
              </div>
              <div className="flex-1">
                <p
                  className={`font-semibold ${
                    action.primary ? 'text-white' : 'text-dark'
                  }`}
                >
                  {action.title}
                </p>
                <p
                  className={`text-xs ${
                    action.primary ? 'text-white/70' : 'text-gray'
                  }`}
                >
                  {action.subtitle}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faArrowRight}
                className={`text-sm transition-transform group-hover:translate-x-1 ${
                  action.primary ? 'text-white/70' : 'text-gray'
                }`}
              />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardQuickActions;
