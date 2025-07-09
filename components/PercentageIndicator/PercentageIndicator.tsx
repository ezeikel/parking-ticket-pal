'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type PercentageIndicatorProps = {
  percentage: number;
  size?: number; // Simple width/height in pixels
  showLabel?: boolean;
  detailed?: boolean;
  className?: string;
};

const PercentageIndicator = ({
  percentage,
  size,
  showLabel = true,
  detailed = false,
  className,
}: PercentageIndicatorProps) => {
  const [progress, setProgress] = useState(0);

  // Determine color based on percentage
  const colorVariant =
    percentage >= 70 ? 'high' : percentage >= 40 ? 'medium' : 'low';

  // Fixed viewBox and circle properties - the SVG will scale to fill container
  const viewBoxSize = 100;
  const radius = 40;
  const strokeWidth = 6;
  const center = viewBoxSize / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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

  // Container style
  const containerStyle = size ? { width: size, height: size } : undefined;

  // Color classes
  const colorClasses = {
    high: {
      stroke: 'stroke-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      label: 'text-emerald-700 dark:text-emerald-300',
    },
    medium: {
      stroke: 'stroke-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'text-amber-700 dark:text-amber-300',
    },
    low: {
      stroke: 'stroke-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: 'text-red-700 dark:text-red-300',
    },
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        detailed && 'bg-gray-50 dark:bg-gray-800 p-6 rounded-lg',
        className,
      )}
      style={containerStyle}
    >
      {detailed && (
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Challenge Success Rate
        </h3>
      )}
      <div className="relative w-full h-full">
        {/* SVG container - fills its container */}
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          style={{ overflow: 'visible' }}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="stroke-gray-200 dark:stroke-gray-700 fill-none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.1}
            transform={`rotate(-90 ${center} ${center})`}
          />

          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className={cn(
              'transition-all duration-1000 ease-out fill-none',
              colorClasses[colorVariant].stroke,
            )}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset + circumference * 0.1}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />

          {/* Percentage text - SVG centered */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fontWeight="700"
            fontFamily="inherit"
            fontSize={viewBoxSize * 0.3}
            className={colorClasses[colorVariant].text}
            fill="currentColor"
          >
            {progress}
          </text>
        </svg>
      </div>

      {showLabel && (
        <>
          <p
            className={cn(
              'text-center font-medium uppercase tracking-wide mt-2',
              colorClasses[colorVariant].label,
              detailed ? 'text-base font-semibold' : 'text-sm',
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

export default PercentageIndicator;
