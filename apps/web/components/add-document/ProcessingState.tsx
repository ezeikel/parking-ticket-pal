'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicket } from '@fortawesome/pro-solid-svg-icons';

const processingSteps = [
  'Scanning your ticket...',
  'Extracting details...',
  'Analyzing information...',
  'Almost done...',
];

type ProcessingStateProps = {
  className?: string;
};

const ProcessingState = ({ className = '' }: ProcessingStateProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % processingSteps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex flex-col items-center justify-center py-16 ${className}`}
    >
      {/* Animated Icon */}
      <div className="relative">
        {/* Outer pulse ring */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-teal/20"
          style={{ width: 120, height: 120, marginLeft: -10, marginTop: -10 }}
        />

        {/* Icon container */}
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-teal/10"
        >
          <FontAwesomeIcon icon={faTicket} className="text-4xl text-teal" />
        </motion.div>
      </div>

      {/* Progress text */}
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mt-8 text-center"
      >
        <p className="text-lg font-semibold text-dark">
          {processingSteps[stepIndex]}
        </p>
        <p className="mt-2 text-sm text-gray">
          This usually takes a few seconds
        </p>
      </motion.div>

      {/* Progress dots */}
      <div className="mt-6 flex gap-2">
        {processingSteps.map((_, index) => (
          <motion.div
            key={index}
            animate={{
              scale: index === stepIndex ? 1.2 : 1,
              backgroundColor: index === stepIndex ? '#2DD4BF' : '#E5E7EB',
            }}
            className="h-2 w-2 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
};

export default ProcessingState;
