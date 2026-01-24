'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';

const authorities = [
  'Lewisham',
  'Westminster',
  'TfL',
  'Hammersmith & Fulham',
  'Tower Hamlets',
  'Southwark',
  'Lambeth',
  'APCOA',
  'Horizon Parking',
  'UK Parking Control',
  'Camden',
  'Islington',
  'Hackney',
  'Wandsworth',
];

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const Authorities = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="overflow-hidden bg-light py-16 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="mb-12 text-center"
        >
          <h2 className="text-2xl font-bold text-dark md:text-3xl">
            Works With 40+ UK Authorities
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray">
            Council PCNs, TfL, and private parking companies
          </p>
        </motion.div>
      </div>

      {/* Marquee */}
      <div className="relative">
        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-light to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-light to-transparent" />

        {/* Scrolling content */}
        <div className="flex gap-6 overflow-hidden">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              x: {
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'loop',
                duration: 30,
                ease: 'linear',
              },
            }}
            className="flex shrink-0 gap-6"
          >
            {[...authorities, ...authorities].map((authority, index) => (
              <div
                key={`${authority}-${index}`}
                className="flex h-14 shrink-0 items-center justify-center rounded-xl border border-border bg-white px-8 text-sm font-medium text-dark grayscale transition-all hover:border-teal hover:text-teal hover:grayscale-0"
              >
                {authority}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Footer text */}
      <div className="mx-auto max-w-[1280px] px-6">
        <motion.p
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center text-sm text-gray"
        >
          {
            "Don't see your council? We support manual appeals for any UK authority."
          }
        </motion.p>
      </div>
    </section>
  );
};

export default Authorities;
