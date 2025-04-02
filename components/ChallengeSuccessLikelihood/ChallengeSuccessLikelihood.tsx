'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

type ChallengeSuccessLikelihoodProps = {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  detailed?: boolean;
  className?: string;
};

const circleVariants = cva('transition-all duration-1000 ease-out fill-none', {
  variants: {
    color: {
      high: 'stroke-emerald-500',
      medium: 'stroke-amber-500',
      low: 'stroke-red-500',
    },
    size: {
      sm: 'stroke-[6]',
      md: 'stroke-[8]',
      lg: 'stroke-[10]',
    },
  },
  defaultVariants: {
    color: 'medium',
    size: 'md',
  },
});

const textVariants = cva('font-bold', {
  variants: {
    color: {
      high: 'text-emerald-600 dark:text-emerald-400',
      medium: 'text-amber-600 dark:text-amber-400',
      low: 'text-red-600 dark:text-red-400',
    },
    size: {
      sm: 'text-lg',
      md: 'text-3xl',
      lg: 'text-4xl font-extrabold',
    },
  },
  defaultVariants: {
    color: 'medium',
    size: 'md',
  },
});

const labelVariants = cva('text-center font-medium uppercase tracking-wide', {
  variants: {
    color: {
      high: 'text-emerald-700 dark:text-emerald-300',
      medium: 'text-amber-700 dark:text-amber-300',
      low: 'text-red-700 dark:text-red-300',
    },
    size: {
      sm: 'text-[10px] mt-1',
      md: 'text-sm mt-2',
      lg: 'text-base mt-3 font-semibold',
    },
  },
  defaultVariants: {
    color: 'medium',
    size: 'md',
  },
});

const containerSizes = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
} as const;

const ChallengeSuccessLikelihood = ({
  percentage,
  size = 'md',
  showLabel = true,
  detailed = false,
  className,
}: ChallengeSuccessLikelihoodProps) => {
  const [progress, setProgress] = useState(0);

  // Determine color based on percentage
  const colorVariant =
    percentage >= 70 ? 'high' : percentage >= 40 ? 'medium' : 'low';

  // Calculate circle properties
  const radius = size === 'sm' ? 30 : size === 'md' ? 45 : 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 8 : 10;

  // Get label text based on percentage
  const getLabelText = () => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    if (percentage >= 20) return 'Low';
    return 'Very low';
  };

  // Animate the progress on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        detailed && 'bg-gray-50 dark:bg-gray-800 p-6 rounded-lg',
        className,
      )}
    >
      {detailed && (
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Challenge Success Rate
        </h3>
      )}
      <div className={cn('relative', containerSizes[size])}>
        {/* SVG container with proper viewBox to prevent clipping */}
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}
          style={{ overflow: 'visible' }}
        >
          {/* Background circle - slightly lighter than the track */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            className="stroke-gray-200 dark:stroke-gray-700 fill-none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.1} // Creates a gap at the top
            transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
          />

          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            className={cn(circleVariants({ color: colorVariant, size }))}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset + circumference * 0.1} // Adds the same gap
            strokeLinecap="round"
            transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
          />
        </svg>

        {/* Percentage text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              textVariants({
                color: colorVariant,
                size: detailed ? 'lg' : size,
              }),
            )}
          >
            {progress}
          </span>
        </div>
      </div>

      {showLabel && (
        <>
          <p
            className={cn(
              labelVariants({
                color: colorVariant,
                size: detailed ? 'lg' : size,
              }),
            )}
          >
            {getLabelText()}
          </p>
          {detailed && (
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mt-4 max-w-xs">
              Based on similar tickets and historical data
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ChallengeSuccessLikelihood;
