'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faShareNodes,
} from '@fortawesome/pro-solid-svg-icons';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type Props = {
  link: string;
  code: string;
};

const ReferralLinkCopy = ({ link, code }: Props) => {
  const [copied, setCopied] = useState(false);
  const { track } = useAnalytics();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      track(TRACKING_EVENTS.REFERRAL_LINK_COPIED, { code });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      track(TRACKING_EVENTS.REFERRAL_LINK_COPIED, { code });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Parking Ticket Pal',
          text: 'Sign up and get £3 off your first ticket challenge!',
          url: link,
        });
        track(TRACKING_EVENTS.REFERRAL_LINK_SHARED, {
          code,
          share_method: 'native',
        });
      } catch {
        // User cancelled share
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={link}
          className="flex-1 rounded-xl border border-gray-200 bg-light px-4 py-3 text-sm text-dark"
        />
        <button
          onClick={handleCopy}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal text-white transition-colors hover:bg-teal-dark"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleShare}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-dark transition-colors hover:bg-light"
          >
            <FontAwesomeIcon icon={faShareNodes} />
          </button>
        )}
      </div>
      {copied && (
        <p className="text-sm font-medium text-teal">
          Link copied to clipboard!
        </p>
      )}
    </div>
  );
};

export default ReferralLinkCopy;
