'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faArrowLeft,
  faEnvelope,
} from '@fortawesome/pro-solid-svg-icons';
import RegInput from '@/components/tools/vehicle/RegInput';
import VehicleInfoCard from '@/components/tools/vehicle/VehicleInfoCard';
import { fetchVehicleDetails } from '@/app/actions/tools';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import type { VehicleDetails } from '@/lib/dvla';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const VehicleLookupPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VehicleDetails | null>(null);
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

    track(TRACKING_EVENTS.VEHICLE_LOOKUP_SEARCHED, { registration });

    try {
      const response = await fetchVehicleDetails(registration);

      if (response.success && response.data) {
        setResult(response.data);
        track(TRACKING_EVENTS.VEHICLE_LOOKUP_RESULT_VIEWED, {
          registration,
          make: response.data.make ?? null,
          taxStatus: response.data.taxStatus ?? null,
          motStatus: response.data.motStatus ?? null,
        });
      } else {
        setError(response.error || 'Failed to fetch vehicle details');
      }
    } catch (err) {
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
              <FontAwesomeIcon icon={faCar} className="text-2xl text-teal" />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              Free Vehicle Info Lookup
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Check tax status, MOT status, emissions, and full vehicle details
              for any UK registered vehicle.
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

      {/* Results Section */}
      {result && (
        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-[800px] px-6">
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

            {/* Vehicle details */}
            <VehicleInfoCard vehicle={result} />

            {/* Additional actions */}
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href={`/tools/vehicle/mot-check?reg=${searchedReg}`}
                className="inline-flex items-center gap-2 rounded-lg bg-light px-4 py-2 text-sm font-medium text-dark hover:bg-gray/20"
              >
                View Full MOT History
              </Link>
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
                  <li>• Vehicle tax status</li>
                  <li>• MOT status & expiry</li>
                  <li>• Make, model & colour</li>
                  <li>• CO2 emissions</li>
                  <li>• Fuel type & engine size</li>
                  <li>• First registration date</li>
                </ul>
              </div>

              <div className="rounded-xl bg-light p-6">
                <h3 className="font-bold text-dark">Why check a vehicle?</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray">
                  <li>• Verify tax before buying</li>
                  <li>• Check MOT expiry</li>
                  <li>• Confirm vehicle details</li>
                  <li>• Check emissions band</li>
                  <li>• See if marked for export</li>
                </ul>
              </div>

              <div className="rounded-xl bg-light p-6">
                <h3 className="font-bold text-dark">Data source</h3>
                <p className="mt-3 text-sm text-gray">
                  This tool uses official DVLA Vehicle Enquiry Service data.
                  Information is updated in real-time and covers all UK
                  registered vehicles.
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

export default VehicleLookupPage;
