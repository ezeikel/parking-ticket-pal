'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge,
  faArrowLeft,
  faEnvelope,
} from '@fortawesome/pro-solid-svg-icons';
import RegInput from '@/components/tools/vehicle/RegInput';
import VehicleInfoCard from '@/components/tools/vehicle/VehicleInfoCard';
import MOTHistoryTimeline from '@/components/tools/vehicle/MOTHistoryTimeline';
import { fetchMOTHistory } from '@/app/actions/tools';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import type { MOTVehicle } from '@/lib/dvla';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const MOTCheckPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MOTVehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedReg, setSearchedReg] = useState<string | null>(null);
  const { track } = useAnalytics();

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  const handleSearch = async (registration: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSearchedReg(registration);

    track(TRACKING_EVENTS.MOT_CHECK_SEARCHED, { registration });

    try {
      const response = await fetchMOTHistory(registration);

      if (response.success && response.data) {
        setResult(response.data);
        track(TRACKING_EVENTS.MOT_CHECK_RESULT_VIEWED, {
          registration,
          has_history: (response.data.motTests?.length ?? 0) > 0,
          test_count: response.data.motTests?.length ?? 0,
        });
      } else {
        setError(response.error || 'Failed to fetch MOT history');
      }
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSearchedReg(null);
  };

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
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal/10">
              <FontAwesomeIcon icon={faGauge} className="text-2xl text-teal" />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              Free MOT History Check
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Check the full MOT history of any UK vehicle. See test results,
              advisories, mileage records, and expiry dates.
            </p>

            {/* Search input */}
            <div className="mt-8 flex justify-center">
              <RegInput
                onSubmit={handleSearch}
                isLoading={isLoading}
                placeholder="Enter reg (e.g. AB12 CDE)"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto mt-4 max-w-md rounded-lg bg-coral/10 p-4 text-coral"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-[1280px] px-6">
            {/* Vehicle card skeleton */}
            <div className="mb-8 animate-pulse rounded-2xl bg-light p-6">
              <div className="mb-4 flex items-center gap-4">
                <div className="h-10 w-28 rounded-lg bg-gray/10" />
                <div className="h-6 w-48 rounded bg-gray/10" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="h-14 rounded-lg bg-gray/10" />
                <div className="h-14 rounded-lg bg-gray/10" />
              </div>
            </div>
            {/* Timeline skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-light p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-6 w-16 rounded-full bg-gray/10" />
                    <div className="h-4 w-32 rounded bg-gray/10" />
                  </div>
                  <div className="flex gap-4">
                    <div className="h-4 w-24 rounded bg-gray/10" />
                    <div className="h-4 w-28 rounded bg-gray/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Results Section */}
      {result && (
        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-[1280px] px-6">
            {/* Reset button */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-dark">
                Results for {searchedReg}
              </h2>
              <button
                onClick={handleReset}
                className="text-sm text-teal hover:underline"
              >
                Search another vehicle
              </button>
            </div>

            {/* Vehicle summary */}
            <div className="mb-8">
              <VehicleInfoCard motData={result} />
            </div>

            {/* MOT Timeline */}
            <div>
              <h3 className="mb-6 text-lg font-bold text-dark">MOT History</h3>
              <MOTHistoryTimeline tests={result.motTests || []} />
            </div>
          </div>
        </section>
      )}

      {/* Info Section (shown when no results) */}
      {!result && !isLoading && (
        <section className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1280px] px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-xl bg-light p-6">
                <h3 className="font-bold text-dark">What you&apos;ll see</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray">
                  <li>• Full MOT test history</li>
                  <li>• Pass/fail results</li>
                  <li>• Advisory notices</li>
                  <li>• Mileage at each test</li>
                  <li>• MOT expiry date</li>
                </ul>
              </div>

              <div className="rounded-xl bg-light p-6">
                <h3 className="font-bold text-dark">Why check MOT history?</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray">
                  <li>• Verify mileage consistency</li>
                  <li>• Check recurring issues</li>
                  <li>• Assess vehicle condition</li>
                  <li>• Make informed buying decisions</li>
                </ul>
              </div>

              <div className="rounded-xl bg-light p-6">
                <h3 className="font-bold text-dark">Data source</h3>
                <p className="mt-3 text-sm text-gray">
                  This tool uses official DVLA data. MOT records are typically
                  available for vehicles registered in England, Scotland, and
                  Wales since 2005.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-dark py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Got a Parking Ticket?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray">
            Our AI writes personalized appeal letters based on real tribunal
            wins. Upload your ticket and see your chances of success.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            <FontAwesomeIcon icon={faEnvelope} />
            Upload Your Ticket
          </Link>
        </div>
      </section>
    </div>
  );
};

export default MOTCheckPage;
