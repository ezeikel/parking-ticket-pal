'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload,
  faWandMagicSparkles,
  faPaperPlane,
  faMobileScreen,
  faFileLines,
  faCircleCheck,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type Step = {
  number: number;
  icon: IconDefinition;
  title: string;
  description: string;
  visual: IconDefinition;
};

const steps: Step[] = [
  {
    number: 1,
    icon: faUpload,
    title: 'Upload Your Ticket',
    description:
      'Snap a photo of your PCN or upload the PDF. Our AI extracts all the details instantly - PCN number, vehicle reg, contravention code, deadline dates.',
    visual: faMobileScreen,
  },
  {
    number: 2,
    icon: faWandMagicSparkles,
    title: 'AI Analyzes & Generates Appeal',
    description:
      'We check your ticket against thousands of tribunal cases, calculate your success probability, and generate a legally-sound appeal letter tailored to your specific contravention.',
    visual: faFileLines,
  },
  {
    number: 3,
    icon: faPaperPlane,
    title: 'We Handle the Paperwork',
    description:
      'Download your appeal letter as PDF, or let us auto-submit it directly to the council. We pre-fill all the forms (PE2, PE3, TE7, TE9) and track your case through every stage.',
    visual: faCircleCheck,
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

const HowItWorksSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" ref={ref} className="bg-light py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-dark md:text-4xl">
            How Parking Ticket Pal Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
            From ticket to appeal in minutes, not hours
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector Line - Desktop */}
          <div className="absolute top-8 left-[calc(16.67%+48px)] right-[calc(16.67%+48px)] hidden h-[2px] md:block">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full w-full origin-left border-t-2 border-dashed border-dark/20"
            />
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                variants={fadeUpVariants}
                transition={{ delay: index * 0.2 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={
                    isInView
                      ? { scale: 1, opacity: 1 }
                      : { scale: 0.8, opacity: 0 }
                  }
                  transition={{
                    type: 'spring' as const,
                    stiffness: 200,
                    delay: index * 0.2,
                  }}
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-dark shadow-lg"
                >
                  <FontAwesomeIcon
                    icon={step.icon}
                    className="text-2xl text-white"
                  />
                </motion.div>

                {/* Step Number Badge */}
                <div className="absolute top-0 right-1/2 translate-x-10 -translate-y-1 flex h-6 w-6 items-center justify-center rounded-full bg-dark text-xs font-bold text-white">
                  {step.number}
                </div>

                {/* Content Card */}
                <div className="mt-8 rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
                  <h3 className="text-xl font-bold text-dark">{step.title}</h3>
                  <p className="mt-3 text-base text-gray">{step.description}</p>

                  {/* Visual Icon */}
                  <div className="mt-6 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-light">
                      <FontAwesomeIcon
                        icon={step.visual}
                        className="text-xl text-dark"
                      />
                    </div>
                  </div>
                </div>

                {/* Mobile Connector */}
                {index < steps.length - 1 && (
                  <div className="absolute -bottom-4 left-1/2 h-8 w-[2px] -translate-x-1/2 border-l-2 border-dashed border-dark/20 md:hidden" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
