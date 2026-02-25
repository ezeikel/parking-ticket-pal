'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';

type Props = {
  code: string;
  referrerName: string;
};

const ReferralLandingClient = ({ code, referrerName }: Props) => {
  useEffect(() => {
    // Set referral cookie (30-day expiry)
    Cookies.set('ptp_referral_code', code, { expires: 30, path: '/' });
    Cookies.set('ptp_referral_captured_at', new Date().toISOString(), {
      expires: 30,
      path: '/',
    });

    // localStorage backup
    try {
      localStorage.setItem('ptp_referral_code', code);
      localStorage.setItem(
        'ptp_referral_captured_at',
        new Date().toISOString(),
      );
    } catch {
      // localStorage may not be available
    }
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-light px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
            <span className="text-3xl">🎁</span>
          </div>
          <h1 className="text-2xl font-bold text-dark">
            {referrerName} invited you!
          </h1>
          <p className="mt-2 text-gray">
            Sign up for Parking Ticket Pal and get{' '}
            <span className="font-semibold text-teal">£3 off</span> your first
            Premium ticket challenge.
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-light p-4">
          <h3 className="mb-2 text-sm font-semibold text-dark">How it works</h3>
          <ul className="space-y-2 text-sm text-gray">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-medium text-teal">1.</span>
              Sign up for a free account
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-medium text-teal">2.</span>
              Upload your parking ticket
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-medium text-teal">3.</span>
              £3 credit applied automatically at checkout
            </li>
          </ul>
        </div>

        <Link
          href="/auth/signin"
          className="block w-full rounded-xl bg-teal py-3 text-center font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          Sign Up Free
        </Link>

        <p className="mt-4 text-center text-xs text-gray">
          Plus, {referrerName} gets £5 credit when you sign up!
        </p>
      </div>
    </div>
  );
};

export default ReferralLandingClient;
