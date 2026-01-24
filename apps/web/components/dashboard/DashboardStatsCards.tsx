'use client';

import { useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faSterlingSign,
  faTrophy,
  faCalendarDays,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type StatCard = {
  icon: IconDefinition;
  iconBg: string;
  iconColor: string;
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  trend?: string;
  trendColor?: string;
};

type DashboardStatsCardsProps = {
  totalTickets: number;
  outstandingFines: number;
  appealSuccessRate: number;
  dueThisWeek: number;
  ticketsThisMonth?: number;
  discountPeriodAmount?: number;
  appealsWon?: number;
  appealsTotal?: number;
  nextDeadlineDays?: number;
};

const AnimatedNumber = ({
  value,
  prefix = '',
  suffix = '',
  isInView,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  isInView: boolean;
}) => {
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString(),
  );

  if (isInView) {
    spring.set(value);
  }

  return (
    <motion.span>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  }),
};

const DashboardStatsCards = ({
  totalTickets,
  outstandingFines,
  appealSuccessRate,
  dueThisWeek,
  ticketsThisMonth = 0,
  discountPeriodAmount = 0,
  appealsWon = 0,
  appealsTotal = 0,
  nextDeadlineDays,
}: DashboardStatsCardsProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const stats: StatCard[] = [
    {
      icon: faTicket,
      iconBg: 'bg-light',
      iconColor: 'text-dark',
      value: totalTickets,
      label: 'Total Tickets',
      trend: ticketsThisMonth > 0 ? `+${ticketsThisMonth} this month` : undefined,
      trendColor: 'text-gray',
    },
    {
      icon: faSterlingSign,
      iconBg: 'bg-light',
      iconColor: 'text-dark',
      value: Math.round(outstandingFines / 100),
      prefix: '£',
      label: 'Outstanding Fines',
      trend:
        discountPeriodAmount > 0
          ? `£${Math.round(discountPeriodAmount / 100)} in discount period`
          : undefined,
      trendColor: 'text-gray',
    },
    {
      icon: faTrophy,
      iconBg: 'bg-light',
      iconColor: 'text-dark',
      value: appealSuccessRate,
      suffix: '%',
      label: 'Appeal Success',
      trend:
        appealsTotal > 0
          ? `${appealsWon} of ${appealsTotal} won`
          : 'No appeals yet',
      trendColor: 'text-gray',
    },
    {
      icon: faCalendarDays,
      iconBg: 'bg-light',
      iconColor: 'text-dark',
      value: dueThisWeek,
      label: 'Due This Week',
      trend:
        nextDeadlineDays !== undefined
          ? `Next: ${nextDeadlineDays} days`
          : undefined,
      trendColor: 'text-gray',
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          custom={index}
          variants={cardVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          className="rounded-2xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
        >
          <div
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${stat.iconBg}`}
          >
            <FontAwesomeIcon icon={stat.icon} className={stat.iconColor} />
          </div>
          <div className="mt-3 text-2xl font-bold text-dark md:text-3xl">
            <AnimatedNumber
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              isInView={isInView}
            />
          </div>
          <p className="mt-1 text-sm text-gray">{stat.label}</p>
          {stat.trend && (
            <p className={`mt-2 text-xs font-medium ${stat.trendColor}`}>
              {stat.trend}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardStatsCards;
