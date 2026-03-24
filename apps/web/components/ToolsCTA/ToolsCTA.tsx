'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/pro-solid-svg-icons';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type ToolsCTAProps = {
  /** Contravention code, issuer name, or other context for the CTA */
  context?: string;
  /** Where this CTA appears (used for tracking) */
  location: string;
  /** Optional headline override */
  headline?: string;
  /** Optional description override */
  description?: string;
  /** Optional button text override */
  buttonText?: string;
  /** Optional tribunal case count to display */
  tribunalCount?: number;
  /** Visual variant */
  variant?: 'dark' | 'teal' | 'bordered';
};

const ToolsCTA = ({
  context,
  location,
  headline,
  description,
  buttonText = 'Upload Your Ticket',
  tribunalCount,
  variant = 'dark',
}: ToolsCTAProps) => {
  const { track } = useAnalytics();

  const handleClick = () => {
    track(TRACKING_EVENTS.CTA_CLICKED, {
      cta_name: context ? `tools_upload_${context}` : 'tools_upload',
      location,
    });
  };

  const variantClasses = {
    dark: 'bg-dark text-white',
    teal: 'border-2 border-teal/20 bg-teal/5',
    bordered: 'border border-border bg-white',
  };

  const textClasses = {
    dark: {
      heading: 'text-white',
      body: 'text-white/80',
      button: 'bg-teal text-white hover:bg-teal-dark',
    },
    teal: {
      heading: 'text-dark',
      body: 'text-gray',
      button: 'bg-teal text-white hover:bg-teal-dark',
    },
    bordered: {
      heading: 'text-dark',
      body: 'text-gray',
      button: 'bg-teal text-white hover:bg-teal-dark',
    },
  };

  const classes = textClasses[variant];

  return (
    <div className={`rounded-xl p-6 ${variantClasses[variant]}`}>
      <h3 className={`text-lg font-bold ${classes.heading}`}>
        {headline ??
          (context ? `Got Code ${context}?` : 'Got a parking ticket?')}
      </h3>

      {tribunalCount != null && tribunalCount > 0 && (
        <p className={`mt-2 ${classes.body}`}>
          We&apos;ve analysed{' '}
          <span className="font-semibold text-teal">
            {tribunalCount.toLocaleString()}
          </span>{' '}
          tribunal cases{context ? ` for Code ${context}` : ''}. Upload your
          ticket to get a personalised analysis based on real outcomes.
        </p>
      )}

      <p className={`mt-2 text-sm ${classes.body}`}>
        {description ??
          'Upload your PCN and our AI will write a personalised appeal letter using real tribunal wins.'}
      </p>

      <Link
        href="/"
        onClick={handleClick}
        className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${classes.button}`}
      >
        {buttonText}
        <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
      </Link>
    </div>
  );
};

export default ToolsCTA;
