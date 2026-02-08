'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faGauge,
  faCalendar,
} from '@fortawesome/pro-solid-svg-icons';
import type { MOTTest, MOTDefect } from '@/lib/dvla';

type MOTHistoryTimelineProps = {
  tests: MOTTest[];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatMileage = (value: string, unit: string) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  return `${num.toLocaleString()} ${unit === 'mi' ? 'miles' : 'km'}`;
};

const DefectItem = ({ defect }: { defect: MOTDefect }) => {
  const getDefectStyle = () => {
    switch (defect.type) {
      case 'DANGEROUS':
      case 'FAIL':
        return 'bg-coral/10 text-coral border-coral/20';
      case 'MAJOR':
        return 'bg-amber/10 text-amber border-amber/20';
      case 'MINOR':
      case 'ADVISORY':
      case 'PRS':
      default:
        return 'bg-gray/10 text-gray border-gray/20';
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${getDefectStyle()}`}>
      <div className="flex items-start gap-2">
        {(defect.type === 'DANGEROUS' || defect.type === 'FAIL') && (
          <FontAwesomeIcon
            icon={faCircleXmark}
            className="mt-0.5 shrink-0 text-coral"
          />
        )}
        {(defect.type === 'MAJOR' || defect.type === 'MINOR') && (
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="mt-0.5 shrink-0 text-amber"
          />
        )}
        {(defect.type === 'ADVISORY' || defect.type === 'PRS') && (
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="mt-0.5 shrink-0 text-gray"
          />
        )}
        <div>
          <span className="text-xs font-semibold uppercase">{defect.type}</span>
          <p className="mt-1 text-sm">{defect.text}</p>
        </div>
      </div>
    </div>
  );
};

const MOTTestCard = ({ test, index }: { test: MOTTest; index: number }) => {
  const isPassed = test.testResult === 'PASSED';
  const defects = test.defects || test.rfrAndComments || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative pl-8"
    >
      {/* Timeline line */}
      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />

      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-2 flex h-6 w-6 items-center justify-center rounded-full ${
          isPassed ? 'bg-success' : 'bg-coral'
        }`}
      >
        <FontAwesomeIcon
          icon={isPassed ? faCircleCheck : faCircleXmark}
          className="text-xs text-white"
        />
      </div>

      {/* Card */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                isPassed
                  ? 'bg-success/10 text-success'
                  : 'bg-coral/10 text-coral'
              }`}
            >
              {isPassed ? 'PASS' : 'FAIL'}
            </span>
            <span className="text-sm text-gray">
              Test #{test.motTestNumber}
            </span>
          </div>
          {test.expiryDate && isPassed && (
            <span className="text-sm text-gray">
              Expires: {formatDate(test.expiryDate)}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray">
            <FontAwesomeIcon icon={faCalendar} className="text-dark" />
            {formatDate(test.completedDate)}
          </div>
          <div className="flex items-center gap-2 text-gray">
            <FontAwesomeIcon icon={faGauge} className="text-dark" />
            {formatMileage(test.odometerValue, test.odometerUnit)}
          </div>
        </div>

        {/* Defects */}
        {defects.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-gray">
              {isPassed ? 'Advisories' : 'Reasons for Failure'}
            </p>
            <div className="space-y-2">
              {defects.map((defect, i) => (
                <DefectItem key={`${test.motTestNumber}-${i}`} defect={defect} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const MOTHistoryTimeline = ({ tests }: MOTHistoryTimelineProps) => {
  if (!tests || tests.length === 0) {
    return (
      <div className="rounded-xl bg-light p-6 text-center">
        <p className="text-gray">No MOT history available for this vehicle.</p>
        <p className="mt-2 text-sm text-gray">
          This could mean the vehicle is less than 3 years old or has never had
          an MOT test.
        </p>
      </div>
    );
  }

  // Sort by date, most recent first
  const sortedTests = [...tests].sort(
    (a, b) =>
      new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime(),
  );

  const passCount = tests.filter((t) => t.testResult === 'PASSED').length;
  const failCount = tests.filter((t) => t.testResult === 'FAILED').length;

  return (
    <div>
      {/* Summary */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2">
          <FontAwesomeIcon icon={faCircleCheck} className="text-success" />
          <span className="font-bold text-success">{passCount} Passed</span>
        </div>
        {failCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-coral/10 px-4 py-2">
            <FontAwesomeIcon icon={faCircleXmark} className="text-coral" />
            <span className="font-bold text-coral">{failCount} Failed</span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg bg-light px-4 py-2">
          <span className="text-gray">{tests.length} Total Tests</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {sortedTests.map((test, index) => (
          <MOTTestCard
            key={test.motTestNumber}
            test={test}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default MOTHistoryTimeline;
