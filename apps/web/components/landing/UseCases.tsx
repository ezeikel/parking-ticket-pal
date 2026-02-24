'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faScaleBalanced,
  faTruckFront,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type UseCase = {
  icon: IconDefinition;
  title: string;
  description: string;
};

const useCases: UseCase[] = [
  {
    icon: faClock,
    title: 'I just want to track it and pay on time',
    description:
      'Upload your ticket, see every deadline at a glance, and get reminders before your fine increases. No stress, no surprises.',
  },
  {
    icon: faScaleBalanced,
    title: 'I think my ticket was unfair',
    description:
      'Check your success score based on real tribunal data. If the odds are in your favour, generate an appeal letter and submit it — or let us auto-submit to supported councils.',
  },
  {
    icon: faTruckFront,
    title: 'I manage a fleet of vehicles',
    description:
      'Track tickets across all your vehicles in one dashboard. Bulk upload, shared access for your team, and automated deadline alerts.',
  },
];

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const cardHover = {
  y: -4,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  transition: { duration: 0.2 },
};

const UseCases = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-dark md:text-4xl">
            How drivers use Parking Ticket Pal
          </h2>
        </motion.div>

        {/* Use Case Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={fadeUpVariants}
              transition={{ delay: index * 0.1 }}
              whileHover={cardHover}
              className="flex flex-col rounded-2xl bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal/10">
                <FontAwesomeIcon
                  icon={useCase.icon}
                  className="text-2xl text-teal"
                />
              </div>
              <h3 className="mt-6 text-lg font-bold text-dark">
                {`"${useCase.title}"`}
              </h3>
              <p className="mt-3 flex-1 text-base text-gray">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
