'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot,
  faGlobe,
  faPaperPlane,
} from '@fortawesome/pro-solid-svg-icons';
import PortalDemoPreview from '../PortalDemoPreview/PortalDemoPreview';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const features = [
  {
    icon: faGlobe,
    title: 'Live Portal Status',
    description:
      'We check the council portal in real time so you always know where your ticket stands',
  },
  {
    icon: faPaperPlane,
    title: 'Auto-Submit Challenges',
    description:
      'Your challenge is submitted directly to the council portal — no forms, no queues',
  },
];

const PortalAutomationSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="bg-white py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-4 py-2 text-sm font-medium text-teal">
              <FontAwesomeIcon icon={faRobot} className="text-xs" />
              Portal Automation
            </div>

            <h2 className="mt-6 text-3xl font-bold text-dark md:text-4xl">
              We Talk to the <span className="text-teal">Council</span> So You
              Don&apos;t Have To
            </h2>

            <p className="mt-4 text-lg text-gray">
              Our automation connects directly to 40+ council and issuer
              portals. We check your ticket status in real time, and when
              you&apos;re ready to challenge, we submit it straight to the
              source — no paperwork, no waiting on hold.
            </p>

            {/* Feature list */}
            <div className="mt-8 space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-light shadow-sm">
                    <FontAwesomeIcon
                      icon={feature.icon}
                      className="text-dark"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark">{feature.title}</h3>
                    <p className="text-sm text-gray">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Browser Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            <PortalDemoPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PortalAutomationSection;
