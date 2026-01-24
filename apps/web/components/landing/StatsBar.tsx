'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faSterlingSign,
  faChartLine,
  faStar,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type StatItem = {
  value: number;
  suffix: string;
  prefix: string;
  label: string;
  icon: IconDefinition;
};

const stats: StatItem[] = [
  {
    value: 12847,
    suffix: '',
    prefix: '',
    label: 'Tickets Uploaded',
    icon: faTicket,
  },
  {
    value: 2.4,
    suffix: 'M',
    prefix: '£',
    label: 'Saved by Drivers',
    icon: faSterlingSign,
  },
  {
    value: 73,
    suffix: '%',
    prefix: '',
    label: 'Appeal Success Rate',
    icon: faChartLine,
  },
  {
    value: 4.9,
    suffix: '/5',
    prefix: '',
    label: 'App Store Rating',
    icon: faStar,
  },
];

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  isInView: boolean;
};

const AnimatedNumber = ({
  value,
  prefix = '',
  suffix = '',
  isInView,
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const springValue = useSpring(0, { damping: 30, stiffness: 100 });
  const rounded = useTransform(springValue, (v) => {
    if (value < 10) {
      return v.toFixed(1);
    }
    return Math.round(v).toLocaleString();
  });

  useEffect(() => {
    if (isInView) {
      springValue.set(value);
    }
  }, [isInView, value, springValue]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      setDisplayValue(Number.parseFloat(v.replace(/,/g, '')));
    });
    return () => unsubscribe();
  }, [rounded]);

  const formattedValue =
    value < 10
      ? displayValue.toFixed(1)
      : Math.round(displayValue).toLocaleString();

  return (
    <span>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
};

const StatsBar = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="bg-dark py-12">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 20, scale: 0.95 }
              }
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={isInView ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10"
              >
                <FontAwesomeIcon
                  icon={stat.icon}
                  className="text-xl text-white/80"
                />
              </motion.div>
              <div className="text-3xl font-extrabold text-white md:text-4xl">
                <AnimatedNumber
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  isInView={isInView}
                />
              </div>
              <p className="mt-1 text-sm font-medium text-white/60">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
