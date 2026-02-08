'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faFileLines,
  faBook,
  faGauge,
  faCarBattery,
  faMoneyBillWave,
  faGavel,
  faScaleBalanced,
  faEnvelope,
  faBuilding,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type ToolLink = {
  name: string;
  href: string;
};

type ToolCategory = {
  title: string;
  description: string;
  icon: IconDefinition;
  href: string | null; // null means individual tool links instead of card-level link
  tools: string[] | ToolLink[];
  badge?: string;
};

const categories: ToolCategory[] = [
  {
    title: 'Vehicle Tools',
    description:
      'Check MOT history, vehicle tax status, and get valuations for any UK vehicle.',
    icon: faCar,
    href: '/tools/vehicle',
    tools: ['MOT History Check', 'Vehicle Info Lookup', 'Car Valuation'],
    badge: 'Popular',
  },
  {
    title: 'Letter Templates',
    description:
      'Free letter templates for parking appeals, bailiff disputes, and general motoring matters.',
    icon: faFileLines,
    href: '/tools/letters',
    tools: ['Parking Appeals', 'Bailiff Response', 'Motoring Letters'],
  },
  {
    title: 'Reference Guides',
    description:
      'Look up contravention codes and find information about UK parking ticket issuers.',
    icon: faBook,
    href: null, // Individual tool links
    tools: [
      { name: 'Contravention Codes', href: '/tools/reference/contravention-codes' },
      { name: 'Issuers Directory', href: '/tools/reference/issuers' },
    ],
  },
];

type QuickTool = {
  title: string;
  description: string;
  icon: IconDefinition;
  href: string;
};

const quickTools: QuickTool[] = [
  {
    title: 'MOT History Check',
    description: 'Check the full MOT history of any UK vehicle',
    icon: faGauge,
    href: '/tools/vehicle/mot-check',
  },
  {
    title: 'Vehicle Info Lookup',
    description: 'Get tax status, emissions, and vehicle details',
    icon: faCarBattery,
    href: '/tools/vehicle/reg-lookup',
  },
  {
    title: 'Car Valuation',
    description: 'Find out how much your car is worth',
    icon: faMoneyBillWave,
    href: '/tools/vehicle/valuation',
  },
  {
    title: 'Parking Appeal Letters',
    description: 'Templates for challenging parking tickets',
    icon: faGavel,
    href: '/tools/letters/parking',
  },
  {
    title: 'Bailiff Response Letters',
    description: 'Templates for dealing with bailiffs',
    icon: faScaleBalanced,
    href: '/tools/letters/bailiff',
  },
  {
    title: 'Contravention Codes',
    description: 'Look up what your PCN code means',
    icon: faBook,
    href: '/tools/reference/contravention-codes',
  },
  {
    title: 'Issuer Directory',
    description: 'Find info about councils & parking companies',
    icon: faBuilding,
    href: '/tools/reference/issuers',
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

const ToolsPage = () => {
  const heroRef = useRef(null);
  const categoriesRef = useRef(null);
  const quickToolsRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const categoriesInView = useInView(categoriesRef, {
    once: true,
    margin: '-100px',
  });
  const quickToolsInView = useInView(quickToolsRef, {
    once: true,
    margin: '-100px',
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section ref={heroRef} className="bg-light py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            animate={heroInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-dark md:text-5xl">
              Free Car Tools & Templates
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
              Everything you need to check your vehicle, understand parking
              tickets, and write professional letters - completely free.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section ref={categoriesRef} className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            animate={categoriesInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-bold text-dark">Browse by Category</h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((category, index) => {
              const cardContent = (
                <>
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-light">
                      <FontAwesomeIcon
                        icon={category.icon}
                        className="text-xl text-dark"
                      />
                    </div>
                    {category.badge && (
                      <span className="rounded-full bg-dark px-2.5 py-1 text-xs font-medium text-white">
                        {category.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-dark">
                    {category.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray">{category.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {category.tools.map((tool) => {
                      // Check if tools are ToolLink objects or plain strings
                      const isToolLink = typeof tool === 'object' && 'href' in tool;

                      if (isToolLink) {
                        return (
                          <Link
                            key={tool.name}
                            href={tool.href}
                            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-dark transition-colors hover:border-dark hover:bg-dark hover:text-white"
                          >
                            {tool.name}
                          </Link>
                        );
                      }

                      return (
                        <span
                          key={tool}
                          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-dark"
                        >
                          {tool}
                        </span>
                      );
                    })}
                  </div>
                </>
              );

              return (
                <motion.div
                  key={category.title}
                  initial="hidden"
                  animate={categoriesInView ? 'visible' : 'hidden'}
                  variants={fadeUpVariants}
                  transition={{ delay: index * 0.1 }}
                  whileHover={cardHover}
                >
                  {category.href ? (
                    <Link
                      href={category.href}
                      className="group block h-full rounded-2xl border border-border bg-white p-6 transition-colors hover:border-dark/20"
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <div className="group block h-full rounded-2xl border border-border bg-white p-6">
                      {cardContent}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Tools Grid */}
      <section ref={quickToolsRef} className="bg-light py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            animate={quickToolsInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-bold text-dark">Quick Access</h2>
            <p className="mt-2 text-gray">Jump straight to our most popular tools</p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickTools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial="hidden"
                animate={quickToolsInView ? 'visible' : 'hidden'}
                variants={fadeUpVariants}
                transition={{ delay: index * 0.05 }}
                whileHover={cardHover}
              >
                <Link
                  href={tool.href}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:border-dark/20"
                >
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-light">
                    <FontAwesomeIcon
                      icon={tool.icon}
                      className="text-lg text-dark"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark">
                      {tool.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray">{tool.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
          >
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Got a Parking Ticket?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Our AI writes personalized appeal letters based on real tribunal
              wins. Upload your ticket and see your chances of success.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-dark"
            >
              <FontAwesomeIcon icon={faEnvelope} />
              Upload Your Ticket
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ToolsPage;
