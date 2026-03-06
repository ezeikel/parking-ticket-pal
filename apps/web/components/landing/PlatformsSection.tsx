'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe,
  faMobileScreen,
  faPuzzlePiece,
} from '@fortawesome/pro-solid-svg-icons';
import {
  faApple,
  faGooglePlay,
  faChrome,
} from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type Platform = {
  icon: IconDefinition;
  name: string;
  tagline: string;
  description: string;
};

const platforms: Platform[] = [
  {
    icon: faGlobe,
    name: 'Web Dashboard',
    tagline: 'Your command centre',
    description:
      'See every ticket, every deadline, and every next step in one place. Generate appeal letters, track live portal status, and submit challenges — without leaving your browser.',
  },
  {
    icon: faMobileScreen,
    name: 'Mobile App',
    tagline: 'Scan it. Track it. Done.',
    description:
      'Point your camera at a ticket and we pull out the details in seconds. Push notifications make sure you never miss a deadline, even when you\u2019re away from your desk.',
  },
  {
    icon: faPuzzlePiece,
    name: 'Chrome Extension',
    tagline: 'Import straight from the source',
    description:
      'Already on your council\u2019s evidence portal? We detect the page and pull in every detail and photo automatically — no retyping, no screenshots.',
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

const PlatformsSection = () => {
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
            Works Where <span className="text-teal">You Do</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
            Desktop, phone, or straight from your council&apos;s website. Pick
            up where you left off, wherever you are.
          </p>
        </motion.div>

        {/* Platform Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={fadeUpVariants}
              transition={{ delay: index * 0.15 }}
              whileHover={cardHover}
              className="flex flex-col rounded-2xl bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10">
                <FontAwesomeIcon
                  icon={platform.icon}
                  className="text-2xl text-teal"
                />
              </div>

              <h3 className="mt-6 text-xl font-bold text-dark">
                {platform.name}
              </h3>

              <p className="mt-1 text-sm font-medium text-teal">
                {platform.tagline}
              </p>

              <p className="mt-4 flex-1 text-base text-gray">
                {platform.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Store badges */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          transition={{ delay: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { icon: faApple, label: 'App Store', href: '#' },
            { icon: faGooglePlay, label: 'Google Play', href: '#' },
            { icon: faChrome, label: 'Chrome Web Store', href: '#' },
          ].map((badge) => (
            <a
              key={badge.label}
              href={badge.href}
              className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-gray transition-colors hover:border-teal hover:text-dark"
            >
              <FontAwesomeIcon icon={badge.icon} className="text-base" />
              {badge.label}
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformsSection;
