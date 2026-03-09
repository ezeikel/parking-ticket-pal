'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faSpinnerThird,
  faBell,
  faCheckCircle,
  faEnvelope,
} from '@fortawesome/pro-solid-svg-icons';
import { faEnvelope as faEnvelopeRegular } from '@fortawesome/pro-regular-svg-icons';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getGuestTicketData, updateGuestTicketData } from '@/utils/guestTicket';
import { getGuestLetterData, updateGuestLetterData } from '@/utils/guestLetter';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { trackLead } from '@/lib/facebook-pixel';
import type { SignInMethod } from '@/types';

const SignupContent = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { track } = useAnalytics();
  const hasTrackedPageView = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTicketData, setHasTicketData] = useState(false);
  const [hasLetterData, setHasLetterData] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestIntent, setGuestIntent] = useState<
    'track' | 'challenge' | undefined
  >(undefined);
  const [ticketInfo, setTicketInfo] = useState<{
    pcnNumber: string;
    vehicleReg: string;
  } | null>(null);
  const [letterInfo, setLetterInfo] = useState<{
    pcnNumber: string;
    letterType: string;
  } | null>(null);

  useEffect(() => {
    const checkGuestData = () => {
      // Check for letter data first (takes priority)
      const letterData = getGuestLetterData();
      if (letterData && letterData.pcnNumber) {
        updateGuestLetterData({ paymentCompleted: true });
        setLetterInfo({
          pcnNumber: letterData.pcnNumber,
          letterType: letterData.letterType,
        });
        setHasLetterData(true);
        setIsLoading(false);

        if (!hasTrackedPageView.current) {
          hasTrackedPageView.current = true;
          track(TRACKING_EVENTS.GUEST_SIGNUP_PAGE_VIEWED, {
            intent: 'track',
            has_pcn: true,
            source: 'letter-wizard',
          });
        }
        return;
      }

      // Fall back to ticket data
      const guestData = getGuestTicketData();

      // Pre-fill email from localStorage if available
      if (guestData?.email) {
        setEmail(guestData.email);
      }

      if (!guestData || !guestData.pcnNumber) {
        // No guest data - redirect to home
        setIsLoading(false);
        return;
      }

      // Capture intent from guest data
      const { intent } = guestData;
      setGuestIntent(intent);

      // Mark as track flow (no payment needed)
      updateGuestTicketData({
        intent: 'track',
        // Mark as "payment completed" so create-ticket page works
        // For track flow, there's no actual payment
        paymentCompleted: true,
      });

      setTicketInfo({
        pcnNumber: guestData.pcnNumber,
        vehicleReg: guestData.vehicleReg,
      });
      setHasTicketData(true);
      setIsLoading(false);

      // Track page view
      if (!hasTrackedPageView.current) {
        hasTrackedPageView.current = true;
        track(TRACKING_EVENTS.GUEST_SIGNUP_PAGE_VIEWED, {
          intent,
          has_pcn: !!guestData.pcnNumber,
          source: 'wizard',
        });
      }
    };

    checkGuestData();
  }, [track]);

  // If user is already logged in, redirect to create ticket or letter
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (hasLetterData) {
        router.push('/guest/create-letter');
      } else if (hasTicketData) {
        router.push('/guest/create-ticket');
      }
    }
  }, [status, session, hasTicketData, hasLetterData, router]);

  const callbackUrl = hasLetterData
    ? '/guest/create-letter'
    : '/guest/create-ticket';

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    track(TRACKING_EVENTS.GUEST_SIGNUP_STARTED, {
      method: 'magic_link' as SignInMethod,
      intent: hasLetterData ? 'track' : guestIntent,
    });
    // Track Facebook Lead event on signup attempt
    trackLead({
      content_name: 'guest_signup',
      content_category: hasLetterData ? 'letter' : guestIntent || 'unknown',
    });
    try {
      await signIn('resend', {
        email,
        callbackUrl,
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = (provider: 'google' | 'apple') => {
    track(TRACKING_EVENTS.GUEST_SIGNUP_STARTED, {
      method: provider as SignInMethod,
      intent: hasLetterData ? 'track' : guestIntent,
    });
    // Track Facebook Lead event on signup attempt
    trackLead({
      content_name: 'guest_signup',
      content_category: hasLetterData ? 'letter' : guestIntent || 'unknown',
    });
    signIn(provider, {
      callbackUrl,
    });
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-teal animate-spin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasTicketData && !hasLetterData) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">No Data Found</CardTitle>
              <CardDescription className="text-center">
                We couldn&apos;t find your details. Please start again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push('/')}
                className="w-full bg-teal text-white hover:bg-teal-dark"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon
                icon={hasLetterData ? faEnvelope : faTicket}
                className="h-8 w-8 text-teal"
              />
            </div>
            <CardTitle>
              {hasLetterData
                ? 'Almost done — sign up to save your letter'
                : 'Almost done — sign up to save your ticket'}
            </CardTitle>
            <CardDescription>
              Create a free account to track your deadline and get reminded
              before your fine increases.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Letter summary */}
            {letterInfo && (
              <div className="rounded-lg border border-border bg-light/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="text-sm text-teal"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-dark">
                      {letterInfo.pcnNumber}
                    </p>
                    <p className="text-sm text-gray">
                      {letterInfo.letterType.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket summary */}
            {!hasLetterData && ticketInfo && (
              <div className="rounded-lg border border-border bg-light/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
                    <FontAwesomeIcon
                      icon={faTicket}
                      className="text-sm text-teal"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-dark">
                      {ticketInfo.pcnNumber}
                    </p>
                    <p className="text-sm text-gray">{ticketInfo.vehicleReg}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="rounded-lg border border-teal/20 bg-teal/5 p-3">
              <div className="flex items-start gap-2">
                <FontAwesomeIcon
                  icon={faBell}
                  className="mt-0.5 text-sm text-teal"
                />
                <div className="text-sm">
                  <p className="font-medium text-dark">What you&apos;ll get:</p>
                  <ul className="mt-1 space-y-1 text-gray">
                    <li className="flex items-center gap-1.5">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-xs text-teal"
                      />
                      SMS + email before your fine doubles
                    </li>
                    <li className="flex items-center gap-1.5">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-xs text-teal"
                      />
                      Track this ticket and any future ones
                    </li>
                    <li className="flex items-center gap-1.5">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-xs text-teal"
                      />
                      See your appeal success score
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* OAuth Options */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-12 gap-3"
                onClick={() => handleOAuthSignIn('google')}
              >
                <FontAwesomeIcon icon={faGoogle} className="h-5 w-5" />
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 gap-3"
                onClick={() => handleOAuthSignIn('apple')}
              >
                <FontAwesomeIcon icon={faApple} className="h-5 w-5" />
                Continue with Apple
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Magic Link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                required
              />
              <Button
                type="submit"
                className="w-full h-12 gap-3 bg-teal text-white hover:bg-teal-dark"
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="h-5 w-5 animate-spin"
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={faEnvelopeRegular}
                    className="h-5 w-5"
                  />
                )}
                {isSubmitting ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our{' '}
              <a href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const GuestSignupPage = () => (
  <Suspense
    fallback={
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-teal animate-spin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }
  >
    <SignupContent />
  </Suspense>
);

export default GuestSignupPage;
