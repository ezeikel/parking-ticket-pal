'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faTicket } from '@fortawesome/pro-solid-svg-icons';

const processingSteps = [
  'Image uploaded',
  'Scanning ticket...',
  'Extracting details...',
  'Checking deadlines...',
];

type ProcessingStateProps = {
  className?: string;
};

const ProcessingState = ({ className = '' }: ProcessingStateProps) => {
  // Step 0 ("Image uploaded") starts completed; step 1 is current on mount
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= processingSteps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
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

      {/* Progress checklist */}
      <div className="mt-8 flex flex-col gap-3">
        {processingSteps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          const getStepIcon = () => {
            if (isCompleted) {
              return (
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="text-base text-teal"
                />
              );
            }
            if (isCurrent) {
              return (
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="flex h-4 w-4 items-center justify-center"
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-teal" />
                </motion.div>
              );
            }
            return (
              <div className="flex h-4 w-4 items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full border-2 border-gray/30" />
              </div>
            );
          };

          const getTextClass = () => {
            if (isCompleted) return 'font-medium text-dark';
            if (isCurrent) return 'font-semibold text-dark';
            return 'text-gray/50';
          };

          return (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              {getStepIcon()}
              <span className={`text-sm ${getTextClass()}`}>{step}</span>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-gray">This usually takes a few seconds</p>
    </motion.div>
  );
};

export default ProcessingState;
