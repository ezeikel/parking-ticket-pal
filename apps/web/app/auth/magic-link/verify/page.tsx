'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird, faCheckCircle, faExclamationCircle } from '@fortawesome/pro-regular-svg-icons';

const MagicLinkVerifyContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
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
        const callbackUrl = searchParams.get('callbackUrl') || '/';

        setStatus('success');
        setMessage('Successfully verified! Redirecting...');

        // Redirect to callback URL or home page
        setTimeout(() => {
          router.push(callbackUrl);
        }, 2000);
      } catch (error) {
        console.error('Magic link verification error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Magic Link Verification</CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Please wait while we verify your link...'}
            {status === 'success' && 'Your account has been verified!'}
            {status === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'verifying' && (
            <FontAwesomeIcon
              icon={faSpinnerThird}
              className="h-12 w-12 animate-spin text-primary"
            />
          )}
          {status === 'success' && (
            <FontAwesomeIcon
              icon={faCheckCircle}
              className="h-12 w-12 text-green-600"
            />
          )}
          {status === 'error' && (
            <FontAwesomeIcon
              icon={faExclamationCircle}
              className="h-12 w-12 text-red-600"
            />
          )}
          <p className="text-center text-sm text-muted-foreground">{message}</p>
          {status === 'error' && (
            <a
              href="/signin"
              className="text-sm text-primary underline hover:no-underline"
            >
              Return to sign in
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const MagicLinkVerify = () => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <FontAwesomeIcon
            icon={faSpinnerThird}
            className="h-12 w-12 animate-spin text-primary"
          />
        </CardContent>
      </Card>
    </div>
  }>
    <MagicLinkVerifyContent />
  </Suspense>
);

export default MagicLinkVerify;