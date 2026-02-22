'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBrain,
  faChartPie,
  faRobot,
  faFileLines,
  faCar,
  faTimeline,
  faFileSignature,
  faSignature,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type Feature = {
  icon: IconDefinition;
  title: string;
  description: string;
  size: 'large' | 'medium' | 'small';
  badge?: string;
  visual?: 'letter' | 'progress' | 'forms' | null;
};

const features: Feature[] = [
  {
    icon: faTimeline,
    title: 'Full Lifecycle Tracking',
    description:
      'From PCN to Notice to Owner to Bailiff stage — we track every step, remind you of deadlines, and tell you exactly what to do next so your fine never increases unnecessarily.',
    size: 'large',
    visual: 'letter',
  },
  {
    icon: faChartPie,
    title: 'Success Score',
    description:
      'Thinking about challenging? See how likely it is to succeed first. We analyse real UK tribunal decisions to give you a data-backed success score.',
    size: 'medium',
    visual: 'progress',
  },
  {
    icon: faRobot,
    title: 'Auto-Submit to 40+ Councils',
    description:
      'For supported councils like Lewisham and Horizon Parking authorities, we can submit your challenge directly - no manual form filling needed.',
    size: 'medium',
    badge: 'Lewisham, Westminster, TfL + more',
  },
  {
    icon: faFileLines,
    title: 'Pre-Filled Legal Forms',
    description:
      'PE2, PE3, TE7, TE9, N244 - we know what forms you need at each stage and pre-fill them with your details and signature.',
    size: 'medium',
    visual: 'forms',
  },
  {
    icon: faCar,
    title: 'Multi-Vehicle Support',
    description:
      'Track tickets across all your vehicles. We auto-detect registration from ticket photos.',
    size: 'small',
  },
  {
    icon: faBrain,
    title: 'Challenge Letters',
    description:
      'Generate appeal letters with optional AI assistance, tailored to your specific ticket and signed with your signature.',
    size: 'small',
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

type FeatureCardProps = {
  feature: Feature;
  index: number;
  isInView: boolean;
};

const FeatureCard = ({ feature, index, isInView }: FeatureCardProps) => {
  const sizeClasses = {
    large: 'md:col-span-2 md:row-span-1',
    medium: 'md:col-span-1 md:row-span-1',
    small: 'md:col-span-1 md:row-span-1',
  };

  return (
    <motion.div
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeUpVariants}
      transition={{ delay: index * 0.1 }}
      whileHover={cardHover}
      className={`group rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)] ${sizeClasses[feature.size]}`}
    >
      <div className="flex h-full flex-col">
        {/* Icon */}
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-light">
          <FontAwesomeIcon icon={feature.icon} className="text-xl text-dark" />
        </div>

        {/* Content */}
        <h3 className="mt-4 text-lg font-bold text-dark">{feature.title}</h3>
        <p className="mt-2 flex-1 text-sm text-gray">{feature.description}</p>

        {/* Badge */}
        {feature.badge && (
          <div className="mt-4">
            <span className="inline-flex items-center rounded-full bg-light px-3 py-1 text-xs font-medium text-dark">
              {feature.badge}
            </span>
          </div>
        )}

        {/* Visual Elements */}
        {feature.visual === 'progress' && (
          <div className="mt-4 flex flex-col items-center justify-center">
            <div className="relative h-28 w-28">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#E5E5E5"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#222222"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={251}
                  initial={{ strokeDashoffset: 251 }}
                  animate={isInView ? { strokeDashoffset: 68 } : {}}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-dark">73%</span>
              </div>
            </div>
            <span className="mt-2 text-xs text-gray">likely to succeed</span>
          </div>
        )}

        {feature.visual === 'letter' && (
          <div className="mt-4 rounded-lg border border-border bg-light p-4">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faFileSignature} className="text-dark" />
              <span className="text-xs font-medium text-dark">
                Appeal Letter Preview
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-2 w-full rounded bg-gray/20" />
              <div className="h-2 w-4/5 rounded bg-gray/20" />
              <div className="h-2 w-3/4 rounded bg-gray/20" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <FontAwesomeIcon
                icon={faSignature}
                className="text-sm text-dark"
              />
              <span className="font-serif text-sm italic text-gray">
                Your Signature
              </span>
            </div>
          </div>
        )}

        {feature.visual === 'forms' && (
          <div className="mt-4 flex justify-center gap-2">
            {['PE2', 'PE3', 'TE7', 'TE9'].map((form, i) => (
              <motion.div
                key={form}
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-light text-xs font-bold text-dark"
              >
                {form}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const FeaturesSection = () => {
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
            Everything You Need to Manage Your Tickets
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
