'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faLock,
  faSpinnerThird,
} from '@fortawesome/pro-solid-svg-icons';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type Scenario = {
  issuer: string;
  portalUrl: string;
  status: string;
  statusColor: string;
  statusBg: string;
  amount: string;
  lastSynced: string;
};

const scenarios: Scenario[] = [
  {
    issuer: 'Lewisham',
    portalUrl: 'lewisham.gov.uk/parking',
    status: 'Case Closed',
    statusColor: 'text-emerald-700',
    statusBg: 'bg-emerald-100',
    amount: '£0.00',
    lastSynced: 'Last synced from Lewisham portal 2 min ago',
  },
  {
    issuer: 'Westminster',
    portalUrl: 'westminster.gov.uk/parking',
    status: 'Challenge Pending',
    statusColor: 'text-amber-700',
    statusBg: 'bg-amber-100',
    amount: '£65.00',
    lastSynced: 'Last synced from Westminster portal 5 min ago',
  },
  {
    issuer: 'TfL',
    portalUrl: 'tfl.gov.uk/congestion-charge',
    status: 'Action Required',
    statusColor: 'text-amber-700',
    statusBg: 'bg-amber-100',
    amount: '£130.00',
    lastSynced: 'Last synced from TfL portal 1 min ago',
  },
];

const issuerPills = [
  'Lewisham',
  'Camden',
  'Westminster',
  'TfL',
  'Horizon',
  'APCOA',
];

// Phase durations in ms
const CONNECTING_DURATION = 2000;
const RESULT_DURATION = 4000;
const CYCLE_DURATION = CONNECTING_DURATION + RESULT_DURATION;
const TICK_INTERVAL = 100;

function getPhase(
  isActive: boolean,
  elapsed: number,
): 'idle' | 'connecting' | 'result' {
  if (!isActive) return 'idle';
  if (elapsed < CONNECTING_DURATION) return 'connecting';
  return 'result';
}

const PortalDemoPreview = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const isInView = useInView(
    // useInView expects a RefObject — create one from state
    { current: containerRef } as React.RefObject<HTMLDivElement>,
    { once: false, margin: '-100px' },
  );
  const { track } = useAnalytics();

  const active = isPlaying && isInView;
  const phase = getPhase(active, elapsed);

  // Tick to advance elapsed time — all setState is inside the interval callback
  useEffect(() => {
    if (!active) return undefined;

    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + TICK_INTERVAL;
        if (next >= CYCLE_DURATION) {
          setCurrentStep((s) => (s + 1) % scenarios.length);
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(id);
  }, [active]);

  const handlePlay = useCallback(() => {
    setCurrentStep(0);
    setElapsed(0);
    setIsPlaying(true);
    track(TRACKING_EVENTS.PORTAL_DEMO_STARTED, {});
  }, [track]);

  const handlePause = useCallback(() => {
    setElapsed(0);
    setIsPlaying(false);
    track(TRACKING_EVENTS.PORTAL_DEMO_STOPPED, {});
  }, [track]);

  const scenario = scenarios[currentStep];

  return (
    <div ref={setContainerRef} className="relative">
      {/* Browser Frame */}
      <div className="relative mx-auto w-[340px] max-w-full">
        {/* Window chrome */}
        <div className="rounded-t-xl bg-slate-800 px-4 py-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>

            {/* URL bar */}
            <div className="flex flex-1 items-center gap-2 rounded-md bg-slate-700 px-3 py-1.5">
              <FontAwesomeIcon
                icon={faLock}
                className="text-[10px] text-green-400"
              />
              <AnimatePresence mode="wait">
                <motion.span
                  key={scenario.portalUrl}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs text-slate-300 truncate"
                >
                  {scenario.portalUrl}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {phase === 'connecting' && (
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="h-0.5 bg-teal"
          />
        )}

        {/* Content area */}
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-6 min-h-[220px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center py-4"
              >
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FontAwesomeIcon
                    icon={faLock}
                    className="text-slate-400 text-lg"
                  />
                </div>
                <p className="text-sm text-slate-500">
                  Press play to see portal checking
                </p>
              </motion.div>
            )}

            {phase === 'connecting' && (
              <motion.div
                key={`connecting-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center py-4"
              >
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="text-teal text-2xl mb-4"
                  spin
                />
                <p className="text-sm font-medium text-slate-700">
                  Connecting to {scenario.issuer} portal...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Checking ticket status
                </p>
              </motion.div>
            )}

            {phase === 'result' && (
              <motion.div
                key={`result-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full py-2"
              >
                {/* Status card */}
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-800">
                      {scenario.issuer}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${scenario.statusBg} ${scenario.statusColor}`}
                    >
                      {scenario.status}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs text-slate-500">
                      Outstanding amount
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {scenario.amount}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                    {scenario.lastSynced}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Issuer pills */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {issuerPills.map((name) => (
          <span
            key={name}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {name}
          </span>
        ))}
        <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal">
          + 40 more
        </span>
      </div>

      {/* Play/Pause button */}
      <div className="mt-5 flex justify-center">
        <motion.button
          type="button"
          onClick={isPlaying ? handlePause : handlePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark text-white font-medium text-sm shadow-lg hover:bg-dark/90 transition-colors"
        >
          <FontAwesomeIcon
            icon={isPlaying ? faPause : faPlay}
            className="text-xs"
          />
          {isPlaying ? 'Pause' : 'Play Demo'}
        </motion.button>
      </div>
    </div>
  );
};

export default PortalDemoPreview;
