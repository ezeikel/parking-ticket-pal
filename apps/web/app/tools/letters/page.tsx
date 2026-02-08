'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faGavel,
  faScaleBalanced,
  faCar,
  faArrowLeft,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  parkingTemplates,
  bailiffTemplates,
  motoringTemplates,
} from '@/data/templates';

type LetterCategory = {
  title: string;
  description: string;
  icon: IconDefinition;
  href: string;
  count: number;
};

const categories: LetterCategory[] = [
  {
    title: 'Parking Appeal Letters',
    description:
      'Templates for challenging parking tickets at every stage - informal challenge, formal representation, and tribunal appeal.',
    icon: faGavel,
    href: '/tools/letters/parking',
    count: parkingTemplates.length,
  },
  {
    title: 'Bailiff Response Letters',
    description:
      'Templates for dealing with enforcement agents - dispute fees, request evidence, payment plans, and complaints.',
    icon: faScaleBalanced,
    href: '/tools/letters/bailiff',
    count: bailiffTemplates.length,
  },
  {
    title: 'General Motoring Letters',
    description:
      'Templates for DVLA matters, insurance disputes, dealer complaints, and other motoring correspondence.',
    icon: faCar,
    href: '/tools/letters/motoring',
    count: motoringTemplates.length,
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

const LettersIndexPage = () => {
  const heroRef = useRef(null);
  const categoriesRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const categoriesInView = useInView(categoriesRef, {
    once: true,
    margin: '-100px',
  });

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
              <FontAwesomeIcon
                icon={faFileLines}
                className="text-2xl text-dark"
              />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              Free Letter Templates
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Professional letter templates for parking appeals, bailiff
              disputes, and general motoring matters. Fill in your details and
              download instantly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section ref={categoriesRef} className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((category, index) => (
              <motion.div
                key={category.title}
                initial="hidden"
                animate={categoriesInView ? 'visible' : 'hidden'}
                variants={fadeUpVariants}
                transition={{ delay: index * 0.1 }}
                whileHover={cardHover}
              >
                <Link
                  href={category.href}
                  className="group block h-full rounded-2xl border border-border bg-white p-6 transition-colors hover:border-dark/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-light">
                      <FontAwesomeIcon
                        icon={category.icon}
                        className="text-xl text-dark"
                      />
                    </div>
                    <span className="rounded-full bg-light px-2.5 py-1 text-xs font-medium text-dark">
                      {category.count} templates
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-dark group-hover:text-teal">
                    {category.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray">{category.description}</p>

                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal">
                    Browse templates
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-xs transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-light py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="font-bold text-dark">How to use</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray">
                <li>1. Choose a template category</li>
                <li>2. Select the template you need</li>
                <li>3. Fill in your details</li>
                <li>4. Download or copy the letter</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="font-bold text-dark">Why templates?</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray">
                <li>• Professional formatting</li>
                <li>• Legally appropriate language</li>
                <li>• Covers key points</li>
                <li>• Easy to customise</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="font-bold text-dark">Need more help?</h3>
              <p className="mt-3 text-sm text-gray">
                Our AI can write a fully personalised letter based on your
                specific circumstances and ticket details.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal hover:underline"
              >
                Upload your ticket
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LettersIndexPage;
