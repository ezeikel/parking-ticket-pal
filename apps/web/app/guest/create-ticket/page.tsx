'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinnerThird,
  faCheckCircle,
  faExclamationTriangle,
} from '@fortawesome/pro-solid-svg-icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getGuestTicketData,
  clearGuestTicketData,
  type GuestTicketData,
} from '@/utils/guestTicket';
import { createTicketFromGuestData } from '@/app/actions/guest';
import { linkAnonymousUser, useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { SignInMethod } from '@/types';

type Step = 'loading' | 'creating' | 'success' | 'error';

type SessionUser = {
  dbId?: string;
  name?: string | null;
  email?: string | null;
};

const GuestCreateTicketPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { track } = useAnalytics();
  const hasLinkedUser = useRef(false);
  const hasTrackedSignupComplete = useRef(false);
  const [step, setStep] = useState<Step>('loading');
  const [guestData, setGuestData] = useState<GuestTicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  useEffect(() => {
    const createTicket = async () => {
      // Wait for session to load
      if (status === 'loading') return;

      // If not authenticated, redirect to claim page
      if (status === 'unauthenticated') {
        router.push('/guest/claim');
        return;
      }

      // Link anonymous user to authenticated user (only once)
      const sessionUser = session?.user as SessionUser | undefined;
      if (sessionUser?.dbId && !hasLinkedUser.current) {
        hasLinkedUser.current = true;
        linkAnonymousUser(sessionUser.dbId);
      }

      // Check for guest data
      const data = getGuestTicketData();
      if (!data || !data.paymentCompleted) {
        setError('No pending ticket found. Your session may have expired.');
        setStep('error');
        return;
      }

      // Track signup completed (user came from guest flow and is now authenticated)
      if (!hasTrackedSignupComplete.current) {
        hasTrackedSignupComplete.current = true;
        const { intent } = data;
        track(TRACKING_EVENTS.GUEST_SIGNUP_COMPLETED, {
          method: SignInMethod.GOOGLE, // Default - we can't determine exact method here
          intent,
        });
      }

      setGuestData(data);
      setStep('creating');

      try {
        // Tier from guest data: 'premium' or null (track flow = FREE tier)
        const tier = data.tier === 'premium' ? data.tier : null;

        // Create ticket with auto vehicle lookup
        const result = await createTicketFromGuestData({
          pcnNumber: data.pcnNumber,
          vehicleReg: data.vehicleReg,
          issuerType: data.issuerType,
          ticketStage: data.ticketStage,
          tier,
          tempImagePath: data.tempImagePath,
          initialAmount: data.initialAmount,
          issuer: data.issuer,
          // No vehicle data provided - will auto-lookup from registration
          autoLookupVehicle: true,
        });

        if (result.success && result.ticketId) {
          // Clear guest data from localStorage
          clearGuestTicketData();
          setCreatedTicketId(result.ticketId);
          setStep('success');
        } else {
          setError(result.error || 'Failed to create ticket');
          setStep('error');
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
        setStep('error');
      }
    };

    createTicket();
  }, [status, session, router, track]);

  if (step === 'loading' || status === 'loading') {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-teal animate-spin"
                />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="h-8 w-8 text-destructive"
                />
              </div>
              <CardTitle>Something Went Wrong</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

  if (step === 'success') {
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
              <CardTitle>Ticket Created!</CardTitle>
              <CardDescription>
                Your ticket has been added to your account. You can now track
                deadlines and access your challenge letter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/tickets/${createdTicketId}`)}
                className="w-full bg-teal text-white hover:bg-teal-dark"
              >
                View Your Ticket
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Creating step
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Creating Your Ticket...</CardTitle>
            <CardDescription>
              We&apos;re looking up your vehicle details and setting up your
              ticket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="h-12 w-12 text-teal animate-spin"
              />
              {guestData && (
                <p className="text-sm text-muted-foreground">
                  Ticket:{' '}
                  <span className="font-mono font-medium">
                    {guestData.pcnNumber}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestCreateTicketPage;
