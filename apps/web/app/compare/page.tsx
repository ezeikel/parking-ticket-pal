'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/pro-solid-svg-icons';
import { competitors } from '@/data/competitors';
import CompetitorCard from '@/components/competitors/CompetitorCard';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const ComparePage = () => {
  const heroRef = useRef(null);
  const gridRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const gridInView = useInView(gridRef, { once: true, margin: '-100px' });

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
              Parking Ticket Pal vs The Alternatives
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
              See how Parking Ticket Pal compares to solicitors, DIY appeals,
              and other services. Find out why thousands of UK motorists choose
              PTP.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Comparison Grid */}
      <section ref={gridRef} className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            animate={gridInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-bold text-dark">
              Choose a Comparison
            </h2>
            <p className="mt-2 text-gray">
              Click any card to see a detailed head-to-head comparison
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {competitors.map((competitor, index) => (
              <motion.div
                key={competitor.id}
                initial="hidden"
                animate={gridInView ? 'visible' : 'hidden'}
                variants={fadeUpVariants}
                transition={{ delay: index * 0.1 }}
              >
                <CompetitorCard competitor={competitor} variant="compare" />
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
              Ready to Fight Your Ticket?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Upload your parking ticket and get an AI-generated appeal letter
              in minutes. Backed by real tribunal data.
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

export default ComparePage;
