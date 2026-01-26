'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinnerThird,
  faMobileAlt,
} from '@fortawesome/pro-regular-svg-icons';

const MagicLinkRedirectContent = () => {
  const searchParams = useSearchParams();
  const [attemptedRedirect, setAttemptedRedirect] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      return;
    }

    // Attempt to deep link to the mobile app
    const deepLink = `parkingticketpal://auth/magic-link/verify?token=${token}`;

    // Try to open the app
    window.location.href = deepLink;
    setAttemptedRedirect(true);

    // Fallback: if the app doesn't open after 2 seconds, show instructions
    const timer = setTimeout(() => {
      setAttemptedRedirect(true);
    }, 2000);

    // eslint-disable-next-line consistent-return
    return () => clearTimeout(timer);
  }, [searchParams]);

  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This magic link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/signin"
              className="text-sm text-primary underline hover:no-underline"
            >
              Return to sign in
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faMobileAlt} />
            Opening Mobile App
          </CardTitle>
          <CardDescription>
            {!attemptedRedirect
              ? 'Redirecting you to the mobile app...'
              : 'If the app did not open automatically, please follow the instructions below.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!attemptedRedirect ? (
            <div className="flex justify-center">
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="h-12 w-12 animate-spin text-primary"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Having trouble? Try these steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Make sure you have the Parking Ticket Pal app installed</li>
                <li>
                  <a
                    href={`parkingticketpal://auth/magic-link/verify?token=${token}`}
                    className="text-primary underline hover:no-underline"
                  >
                    Click here
                  </a>{' '}
                  to open the app manually
                </li>
                <li>
                  If that doesn&apos;t work, copy the link below and open it
                  from your mobile device
                </li>
              </ol>
              <div className="p-3 bg-gray-100 rounded text-xs break-all font-mono">
                parkingticketpal://auth/magic-link/verify?token={token}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MagicLinkRedirect = () => (
  <Suspense
    fallback={
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
    }
  >
    <MagicLinkRedirectContent />
  </Suspense>
);

export default MagicLinkRedirect;
