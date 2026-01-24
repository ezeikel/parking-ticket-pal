'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/pro-solid-svg-icons';

type ScoreGaugeProps = {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  delay?: number;
  locked?: boolean;
  potentialSavings?: number;
  showSavings?: boolean;
};

const getScoreColor = (score: number) => {
  if (score >= 60)
    return { stroke: '#00A699', text: 'text-success', label: 'Good' };
  if (score >= 40)
    return { stroke: '#FFB400', text: 'text-amber', label: 'Fair' };
  return { stroke: '#FF5A5F', text: 'text-coral', label: 'Low' };
};

const sizeConfig = {
  sm: {
    width: 64,
    height: 36,
    strokeWidth: 5,
    fontSize: 'text-sm',
    labelSize: 'text-[8px]',
  },
  md: {
    width: 96,
    height: 54,
    strokeWidth: 6,
    fontSize: 'text-xl',
    labelSize: 'text-[10px]',
  },
  lg: {
    width: 140,
    height: 78,
    strokeWidth: 8,
    fontSize: 'text-3xl',
    labelSize: 'text-xs',
  },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
};

const ScoreGauge = ({
  score,
  size = 'sm',
  showLabel = false,
  animated = true,
  delay = 0,
  locked = false,
  potentialSavings,
  showSavings = false,
}: ScoreGaugeProps) => {
  const config = sizeConfig[size];
  const { stroke, text, label } = getScoreColor(score);

  // When locked, show a blurred/placeholder state
  if (locked) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="relative"
          style={{ width: config.width, height: config.height }}
        >
          <svg
            width={config.width}
            height={config.height + 4}
            viewBox={`0 0 ${config.width} ${config.height + 4}`}
            className="overflow-visible opacity-40"
          >
            {/* Background arc only */}
            <path
              d={`M ${config.strokeWidth / 2} ${config.height} A ${(config.width - config.strokeWidth) / 2} ${(config.width - config.strokeWidth) / 2} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.height}`}
              fill="none"
              stroke="#E5E5E5"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
          </svg>

          {/* Locked indicator */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1">
            <FontAwesomeIcon icon={faLock} className="text-[10px] text-gray" />
            <span
              className={`font-semibold ${size === 'sm' ? 'text-xs' : config.fontSize} text-gray`}
            >
              --
            </span>
          </div>
        </div>

        {showLabel && (
          <span className={`mt-1 font-medium ${config.labelSize} text-gray`}>
            Upgrade
          </span>
        )}
      </div>
    );
  }

  // Arc calculations
  const radius = (config.width - config.strokeWidth) / 2;
  const centerX = config.width / 2;
  const centerY = config.height;

  // Create a 180-degree arc (semi-circle)
  const circumference = Math.PI * radius;

  // Calculate the filled portion
  const fillPercentage = score / 100;
  const emptyLength = circumference - circumference * fillPercentage;

  // Arc path
  const arcPath = `
    M ${centerX - radius} ${centerY}
    A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}
  `;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: config.width, height: config.height }}
      >
        <svg
          width={config.width}
          height={config.height + 4}
          viewBox={`0 0 ${config.width} ${config.height + 4}`}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={arcPath}
            fill="none"
            stroke="#E5E5E5"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled arc */}
          <motion.path
            d={arcPath}
            fill="none"
            stroke={stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: emptyLength }}
            transition={{
              duration: animated ? 0.8 : 0,
              delay,
              ease: 'easeOut',
            }}
          />
        </svg>

        {/* Score text - centered in the arc area */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center">
          <span className={`font-bold ${config.fontSize} ${text}`}>
            {score}%
          </span>
        </div>
      </div>

      {showLabel && (
        <span className={`mt-1 font-medium ${config.labelSize} ${text}`}>
          {label}
        </span>
      )}

      {showSavings && potentialSavings !== undefined && potentialSavings > 0 && (
        <div className="mt-1 text-center">
          <span className={`font-medium ${config.labelSize} text-gray`}>
            Potential savings
          </span>
          <span className={`block font-bold ${config.labelSize} text-success`}>
            {formatCurrency(potentialSavings)}
          </span>
        </div>
      )}
    </div>
  );
};

export default ScoreGauge;
