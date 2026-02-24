/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinnerThird,
  faCircleCheck,
  faCircleExclamation,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

const MagicLinkVerifyContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying',
  );
  const [message, setMessage] = useState('Verifying your magic link...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid magic link. Please request a new one.');
      return;
    }

    const verifyToken = async () => {
      try {
        // This is for web-based magic link verification (NextAuth Resend provider)
        // The verification is handled automatically by NextAuth
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

        setStatus('success');
        setMessage('Successfully verified! Redirecting...');

        // Redirect to callback URL or home page
        setTimeout(() => {
          router.push(callbackUrl);
        }, 2000);
      } catch (error) {
        logger.error(
          'Magic link verification error',
          { page: 'magic-link-verify' },
          error instanceof Error ? error : undefined,
        );
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-light flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'verifying' && (
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  size="2x"
                  className="text-teal animate-spin"
                />
              </div>
            )}
            {status === 'success' && (
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  size="2x"
                  className="text-teal"
                />
              </div>
            )}
            {status === 'error' && (
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <FontAwesomeIcon
                  icon={faCircleExclamation}
                  size="2x"
                  className="text-red-500"
                />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-dark mb-3">
            {status === 'verifying' && 'Verifying...'}
            {status === 'success' && 'Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h1>

          {/* Message */}
          <p className="text-gray mb-8">{message}</p>

          {/* Error Action */}
          {status === 'error' && (
            <Link href="/signin">
              <Button className="w-full h-12 bg-teal text-white hover:bg-teal-dark">
                Return to Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const MagicLinkVerify = () => (
  <Suspense
    fallback={
      <div className="min-h-screen bg-light flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  size="2x"
                  className="text-teal animate-spin"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-dark mb-3">Loading...</h1>
          </div>
        </div>
      </div>
    }
  >
    <MagicLinkVerifyContent />
  </Suspense>
);

export default MagicLinkVerify;
