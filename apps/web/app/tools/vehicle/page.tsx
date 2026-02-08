'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faGauge,
  faCarBattery,
  faMoneyBillWave,
  faTire,
  faOilCan,
  faArrowLeft,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type VehicleTool = {
  title: string;
  description: string;
  icon: IconDefinition;
  href: string;
  available: boolean;
  badge?: string;
};

const tools: VehicleTool[] = [
  {
    title: 'MOT History Check',
    description:
      'Check the full MOT history including test results, advisories, mileage records, and expiry dates.',
    icon: faGauge,
    href: '/tools/vehicle/mot-check',
    available: true,
    badge: 'Popular',
  },
  {
    title: 'Vehicle Info Lookup',
    description:
      'Get tax status, MOT status, emissions, make, model, and full vehicle details.',
    icon: faCarBattery,
    href: '/tools/vehicle/reg-lookup',
    available: true,
  },
  {
    title: 'Car Valuation',
    description:
      'Find out how much your car is worth based on make, model, age, and mileage.',
    icon: faMoneyBillWave,
    href: '/tools/vehicle/valuation',
    available: false,
    badge: 'Coming Soon',
  },
  {
    title: 'Tyre Pressure Lookup',
    description:
      'Find the recommended tyre pressure (PSI) for your specific car model.',
    icon: faTire,
    href: '/tools/vehicle/tyre-pressure',
    available: false,
    badge: 'Coming Soon',
  },
  {
    title: 'Oil Type Finder',
    description:
      'Find out what type of oil your car needs based on make, model, and engine.',
    icon: faOilCan,
    href: '/tools/vehicle/oil-type',
    available: false,
    badge: 'Coming Soon',
  },
];

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const cardHover = {
  y: -4,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  transition: { duration: 0.2 },
};

const VehicleToolsPage = () => {
  const heroRef = useRef(null);
  const toolsRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const toolsInView = useInView(toolsRef, { once: true, margin: '-100px' });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section ref={heroRef} className="bg-light py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Breadcrumb */}
          <motion.div
            initial="hidden"
            animate={heroInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-8"
          >
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Tools
            </Link>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={heroInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="text-center"
          >
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-border">
              <FontAwesomeIcon icon={faCar} className="text-2xl text-dark" />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              Vehicle Tools
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Free tools to check MOT history, vehicle tax status, valuations,
              and more. All data from official DVLA sources.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section ref={toolsRef} className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial="hidden"
                animate={toolsInView ? 'visible' : 'hidden'}
                variants={fadeUpVariants}
                transition={{ delay: index * 0.1 }}
                whileHover={tool.available ? cardHover : undefined}
              >
                {tool.available ? (
                  <Link
                    href={tool.href}
                    className="group block h-full rounded-2xl border border-border bg-white p-6 transition-colors hover:border-dark/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-light">
                        <FontAwesomeIcon
                          icon={tool.icon}
                          className="text-xl text-dark"
                        />
                      </div>
                      {tool.badge && (
                        <span className="rounded-full bg-dark px-2.5 py-1 text-xs font-medium text-white">
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-dark">
                      {tool.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray">{tool.description}</p>

                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal">
                      Use tool
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-xs transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                ) : (
                  <div className="h-full rounded-2xl border border-border bg-white p-6 opacity-50">
                    <div className="flex items-start justify-between">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-light">
                        <FontAwesomeIcon
                          icon={tool.icon}
                          className="text-xl text-gray"
                        />
                      </div>
                      {tool.badge && (
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-gray">
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-dark">
                      {tool.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray">{tool.description}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default VehicleToolsPage;
