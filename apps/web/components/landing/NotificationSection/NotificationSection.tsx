'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faEnvelope,
  faCommentSms,
  faCalendarClock,
} from '@fortawesome/pro-solid-svg-icons';
import NotificationPreview from '../NotificationPreview';

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
    icon: faCalendarClock,
    title: '14-Day Discount Reminders',
    description: 'Get reminded before your early payment discount expires',
  },
  {
    icon: faEnvelope,
    title: 'Email Alerts',
    description: 'Important updates delivered straight to your inbox',
  },
  {
    icon: faCommentSms,
    title: 'SMS Notifications',
    description: 'Time-sensitive alerts via text for urgent deadlines',
  },
];

const NotificationSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="bg-light py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber/10 px-4 py-2 text-sm font-medium text-amber">
              <FontAwesomeIcon icon={faBell} className="text-xs" />
              Never Miss a Deadline
            </div>

            <h2 className="mt-6 text-3xl font-bold text-dark md:text-4xl">
              Stay Ahead of Every{' '}
              <span className="text-teal">Critical Date</span>
            </h2>

            <p className="mt-4 text-lg text-gray">
              We track all your ticket deadlines and send timely reminders via
              email and SMS. From the 14-day discount window to appeal deadlines
              and escalation stages - we make sure you never miss an important
              date.
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
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

          {/* Phone Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            <NotificationPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default NotificationSection;
