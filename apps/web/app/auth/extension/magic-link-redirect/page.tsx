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
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';

type AuthResult = {
  sessionToken: string;
  userId: string;
  email: string;
} | null;

const ExtensionMagicLinkContent = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  const [authResult, setAuthResult] = useState<AuthResult>(null);
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'Invalid or missing token.',
  );

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/extension/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (data.sessionToken && data.userId) {
          setAuthResult({
            sessionToken: data.sessionToken,
            userId: data.userId,
            email: data.email,
          });
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Verification failed.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Network error. Please try again.');
      }
    };

    verify();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Verifying...</CardTitle>
            <CardDescription>
              Signing you into the browser extension.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <FontAwesomeIcon
              icon={faSpinnerThird}
              className="h-12 w-12 animate-spin text-primary"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Verification Failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please try signing in again from the browser extension.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      {/* Hidden element for content script to read */}
      {authResult && (
        <div
          id="ptp-ext-auth"
          data-user-id={authResult.userId}
          data-session-token={authResult.sessionToken}
          data-email={authResult.email}
          style={{ display: 'none' }}
        />
      )}
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Signed in!</CardTitle>
          <CardDescription>
            You&apos;re now signed into the Parking Ticket Pal browser
            extension.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can close this tab and return to your council&apos;s parking
            portal. The extension is ready to import tickets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const ExtensionMagicLinkRedirect = () => (
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
    <ExtensionMagicLinkContent />
  </Suspense>
);

export default ExtensionMagicLinkRedirect;
