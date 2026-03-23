'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faQuoteLeft } from '@fortawesome/pro-regular-svg-icons';
import { faCircleCheck, faStar } from '@fortawesome/pro-solid-svg-icons';
import ScoreGauge from '@/components/ui/ScoreGauge';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type UpgradeBannerProps = {
  ticketId: string;
  daysUntilDiscount?: number;
};

const features = [
  'Success prediction score',
  'AI-drafted challenge letter',
  'Automatic submission',
  '30-day ad-free experience',
];

export default function UpgradeBanner({
  ticketId,
  daysUntilDiscount,
}: UpgradeBannerProps) {
  const router = useRouter();
  const { track } = useAnalytics();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!localStorage.getItem(`upgrade_nudge_dismissed_${ticketId}`);
  });

  useEffect(() => {
    if (!dismissed) {
      track(TRACKING_EVENTS.UPGRADE_NUDGE_SHOWN, {
        ticket_id: ticketId,
        platform: 'web',
      });
    }
  }, [dismissed, ticketId, track]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`upgrade_nudge_dismissed_${ticketId}`, 'true');
    track(TRACKING_EVENTS.UPGRADE_NUDGE_DISMISSED, {
      ticket_id: ticketId,
      platform: 'web',
    });
  };

  const handleUpgrade = () => {
    track(TRACKING_EVENTS.UPGRADE_NUDGE_UPGRADE_TAPPED, {
      ticket_id: ticketId,
      platform: 'web',
    });
    router.push(`/checkout?ticketId=${ticketId}`);
  };

  if (dismissed) return null;

  return (
    <div className="relative mb-6 rounded-xl border border-border bg-white p-5 md:p-6">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
        type="button"
      >
        <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Left: Locked gauge (reuses ScoreGauge component) */}
        <div className="flex flex-col items-center md:w-40 shrink-0">
          <ScoreGauge score={0} size="lg" showLabel locked />
          <p className="mt-1 text-center text-xs text-gray-500">
            See your chances
          </p>
        </div>

        {/* Right: Content */}
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-semibold text-dark">
            Your ticket has been analysed
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            30,000+ cases analysed · 46% average win rate
          </p>

          {/* Deadline urgency */}
          {daysUntilDiscount != null && daysUntilDiscount > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-medium text-amber-800">
                Your discount deadline is in {daysUntilDiscount} day
                {daysUntilDiscount !== 1 ? 's' : ''}. Challenge before your fine
                doubles.
              </p>
            </div>
          )}

          {/* Features */}
          <div className="mb-5 space-y-2">
            {features.map((label) => (
              <div key={label} className="flex items-center gap-2.5">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="h-4 w-4 text-teal"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <FontAwesomeIcon
              icon={faQuoteLeft}
              className="h-3 w-3 text-gray-300 mt-0.5 shrink-0"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-600 leading-snug mb-2">
                &quot;Deadline reminders saved me — had no idea fines double
                after 14 days!&quot;
              </p>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal/20">
                  <span className="text-[10px] font-semibold text-teal">
                    PS
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-700">
                  Priya S.
                </span>
                <span className="text-xs text-gray-400">· Saved £110</span>
                <div className="ml-auto flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FontAwesomeIcon
                      key={i}
                      icon={faStar}
                      className="h-2.5 w-2.5 text-amber-400"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleUpgrade}
              className="rounded-lg bg-dark px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-dark/90"
              type="button"
            >
              Upgrade — £14.99
            </button>
            <button
              onClick={handleDismiss}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
            >
              Not now
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            One-time purchase per ticket. No subscriptions.
          </p>
        </div>
      </div>
    </div>
  );
}
