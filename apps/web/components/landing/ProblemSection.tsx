'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRoute, faClock, faGavel } from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type Problem = {
  icon: IconDefinition;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
};

const problems: Problem[] = [
  {
    icon: faRoute,
    iconBg: 'bg-coral/10',
    iconColor: 'text-coral',
    title: 'Confusing Appeal Process',
    description:
      'Different rules for councils, TfL, and private companies. Each has different forms, deadlines, and requirements.',
  },
  {
    icon: faClock,
    iconBg: 'bg-amber/10',
    iconColor: 'text-amber',
    title: 'Tight Deadlines That Increase Your Fine',
    description:
      'Miss the early payment window and your fine jumps — often by 50%. Miss later deadlines and you risk losing your right to a formal appeal. Every ticket type has different rules.',
  },
  {
    icon: faGavel,
    iconBg: 'bg-gray/10',
    iconColor: 'text-gray',
    title: 'Intimidating Legal Paperwork',
    description:
      'PE2, PE3, TE7, TE9 forms. Order for Recovery. Charge Certificates. The process is complicated enough that most people just pay up.',
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

const ProblemSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-dark md:text-4xl">
            The system isn&apos;t on your side
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
            {
              "You're not alone. Over 8 million parking tickets are issued in the UK every year."
            }
          </p>
        </motion.div>

        {/* Problem Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={fadeUpVariants}
              transition={{ delay: index * 0.15 }}
              whileHover={cardHover}
              className="rounded-2xl bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]"
            >
              <div
                className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${problem.iconBg}`}
              >
                <FontAwesomeIcon
                  icon={problem.icon}
                  className={`text-2xl ${problem.iconColor}`}
                />
              </div>
              <h3 className="mt-6 text-xl font-bold text-dark">
                {problem.title}
              </h3>
              <p className="mt-3 text-base text-gray">{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
