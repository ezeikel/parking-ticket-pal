'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinnerThird,
  faCheckCircle,
  faExclamationTriangle,
  faTicket,
  faCrown,
} from '@fortawesome/pro-solid-svg-icons';
import { TicketTier } from '@parking-ticket-pal/db/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getPendingTickets,
  getPendingTicketById,
  claimPendingTicket,
  type PendingTicketData,
} from '@/app/actions/guest';

type Step = 'loading' | 'select' | 'claiming' | 'success' | 'error';

type PendingTicketDetails = {
  id: string;
  pcnNumber: string;
  vehicleReg: string;
  issuerType: string;
  ticketStage: string;
  tier: TicketTier;
  challengeReason: string | null;
  tempImagePath: string | null;
  initialAmount: number | null;
  issuer: string | null;
};

const ClaimPendingContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [step, setStep] = useState<Step>('loading');
  const [pendingTickets, setPendingTickets] = useState<PendingTicketData[]>([]);
  const [selectedTicket, setSelectedTicket] =
    useState<PendingTicketDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  const pendingTicketId = searchParams.get('id');

  // Claim a ticket (one-click - vehicle info auto-looked up)
  const handleClaimTicket = async (ticket: PendingTicketDetails) => {
    setSelectedTicket(ticket);
    setStep('claiming');

    try {
      const result = await claimPendingTicket(ticket.id);

      if (result.success && result.ticketId) {
        setCreatedTicketId(result.ticketId);
        setStep('success');
      } else {
        setError(result.error || 'Failed to claim ticket');
        setStep('error');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setStep('error');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      // Wait for session to load
      if (status === 'loading') return;

      // If not authenticated, redirect to sign in
      if (status === 'unauthenticated') {
        router.push('/signin?callbackUrl=/guest/claim-pending');
        return;
      }

      // If specific ticket ID provided, claim it directly
      if (pendingTicketId) {
        const ticket = await getPendingTicketById(pendingTicketId);
        if (ticket) {
          // Auto-claim the ticket
          handleClaimTicket(ticket);
        } else {
          setError('Ticket not found or already claimed');
          setStep('error');
        }
        return;
      }

      // Otherwise, load all pending tickets
      const tickets = await getPendingTickets();
      if (tickets.length === 0) {
        setError('No pending tickets found');
        setStep('error');
        return;
      }

      if (tickets.length === 1) {
        // Single ticket - claim it directly
        const ticket = await getPendingTicketById(tickets[0].id);
        if (ticket) {
          handleClaimTicket(ticket);
        } else {
          setError('Ticket not found');
          setStep('error');
        }
      } else {
        // Multiple tickets - show selection
        setPendingTickets(tickets);
        setStep('select');
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pendingTicketId, router]);

  const handleSelectTicket = async (ticketId: string) => {
    const ticket = await getPendingTicketById(ticketId);
    if (ticket) {
      handleClaimTicket(ticket);
    } else {
      setError('Ticket not found');
      setStep('error');
    }
  };

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
                onClick={() => router.push('/dashboard')}
                className="w-full bg-teal text-white hover:bg-teal-dark"
              >
                Go to Dashboard
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
              <CardTitle>Ticket Claimed!</CardTitle>
              <CardDescription>
                Your ticket has been added to your account. You can now track
                deadlines and access your challenge letter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => router.push(`/tickets/${createdTicketId}`)}
                className="w-full bg-teal text-white hover:bg-teal-dark"
              >
                View Your Ticket
              </Button>
              {pendingTickets.length > 1 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTicket(null);
                    setStep('select');
                  }}
                  className="w-full"
                >
                  Claim Another Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'claiming') {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Claiming Your Ticket...</CardTitle>
              <CardDescription>
                We&apos;re looking up your vehicle details and creating your
                ticket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-teal animate-spin"
                />
                {selectedTicket && (
                  <p className="text-sm text-muted-foreground">
                    Ticket:{' '}
                    <span className="font-mono font-medium">
                      {selectedTicket.pcnNumber}
                    </span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Selection step (only shown when multiple pending tickets)
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Select a Ticket to Claim</CardTitle>
            <CardDescription>
              You have {pendingTickets.length} tickets waiting to be added to
              your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => handleSelectTicket(ticket.id)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-teal hover:bg-teal/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
                    <FontAwesomeIcon icon={faTicket} className="text-teal" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-dark">{ticket.pcnNumber}</p>
                    <p className="text-sm text-gray">{ticket.vehicleReg}</p>
                  </div>
                  {ticket.tier === TicketTier.PREMIUM && (
                    <span className="flex items-center gap-1 rounded-full bg-amber/10 px-2 py-1 text-xs font-medium text-amber">
                      <FontAwesomeIcon icon={faCrown} className="text-[10px]" />
                      Premium
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ClaimPendingPage = () => (
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
    <ClaimPendingContent />
  </Suspense>
);

export default ClaimPendingPage;
