'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faSpinnerThird } from '@fortawesome/pro-solid-svg-icons';
import { faEnvelope } from '@fortawesome/pro-regular-svg-icons';
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
import {
  getGuestTicketData,
  updateGuestTicketData,
} from '@/utils/guestTicket';

const ClaimContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      const guestData = getGuestTicketData();

      // Pre-fill email from localStorage if available
      if (guestData?.email) {
        setEmail(guestData.email);
      }

      if (!sessionId) {
        // No session ID - check if we have local data with payment marked
        if (guestData?.paymentCompleted) {
          setPaymentVerified(true);
        }
        setIsLoading(false);
        return;
      }

      // Mark payment as completed in local storage
      const updated = updateGuestTicketData({
        paymentCompleted: true,
        stripeSessionId: sessionId,
      });

      if (updated) {
        setPaymentVerified(true);
      }

      setIsLoading(false);
    };

    verifyPayment();
  }, [sessionId]);

  // If user is already logged in, redirect to create ticket
  useEffect(() => {
    if (status === 'authenticated' && session?.user && paymentVerified) {
      // User is logged in and payment verified - redirect to ticket creation
      router.push('/guest/create-ticket');
    }
  }, [status, session, paymentVerified, router]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await signIn('resend', {
        email,
        callbackUrl: '/guest/create-ticket',
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = (provider: 'google' | 'apple') => {
    signIn(provider, {
      callbackUrl: '/guest/create-ticket',
    });
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Verifying Payment...</CardTitle>
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

  if (!paymentVerified) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Session Expired</CardTitle>
              <CardDescription className="text-center">
                Your local session has expired. If you&apos;ve already paid, sign in
                to claim your ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => router.push('/signin?callbackUrl=/guest/claim-pending')}
                className="w-full bg-teal text-white hover:bg-teal-dark"
              >
                Sign In to Claim Ticket
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Start Over
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
                icon={faCheckCircle}
                className="h-8 w-8 text-teal"
              />
            </div>
            <CardTitle>Payment Successful!</CardTitle>
            <CardDescription>
              Create an account to track your ticket and access your challenge
              letter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
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

const GuestClaimPage = () => (
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
    <ClaimContent />
  </Suspense>
);

export default GuestClaimPage;
