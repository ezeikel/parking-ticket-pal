'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MediaSource, TicketStatus, TicketTier } from '@parking-ticket-pal/db/types';
import { Address } from '@parking-ticket-pal/types';
import { TicketWithRelations, HistoryEvent } from '@/types';
import { updateTicketStatus } from '@/app/actions/ticket';
import { createTicketCheckoutSession } from '@/app/actions/stripe';
import TicketDetailHeader from './TicketDetailHeader';
import TicketPhotoCard from './TicketPhotoCard';
import TicketInfoCard from './TicketInfoCard';
import LocationCard from './LocationCard';
import EvidenceCard from './EvidenceCard';
import PCNJourneyTimeline from './PCNJourneyTimeline';
import AppealLetterCard from './AppealLetterCard';
import AppealLetterSummaryCard from './AppealLetterSummaryCard';
import SuccessPredictionCard from './SuccessPredictionCard';
import ActionsCard from './ActionsCard';
import DeadlineAlertCard from './DeadlineAlertCard';
import ActivityTimelineCard from './ActivityTimelineCard';
import MobileStickyFooter from './MobileStickyFooter';
import LightboxModal from './LightboxModal';
import AddressPromptBanner from '@/components/AddressPromptBanner/AddressPromptBanner';

type TicketDetailPageProps = {
  ticket: TicketWithRelations;
};

const getDeadlineDays = (issuedAt: Date): number => {
  const issued = new Date(issuedAt);
  const deadline = new Date(issued);
  deadline.setDate(deadline.getDate() + 14);
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getCurrentAmount = (
  initialAmount: number,
  status: TicketStatus,
  issuedAt: Date,
): number => {
  const deadlineDays = getDeadlineDays(issuedAt);

  // If within discount period
  if (deadlineDays > 0) {
    return Math.round(initialAmount / 2);
  }

  // If past discount period, check status for overdue/enforcement
  if (
    status === TicketStatus.CHARGE_CERTIFICATE ||
    status === TicketStatus.ORDER_FOR_RECOVERY ||
    status === TicketStatus.ENFORCEMENT_BAILIFF_STAGE
  ) {
    return Math.round(initialAmount * 1.5);
  }

  return initialAmount;
};

const TicketDetailPage = ({ ticket }: TicketDetailPageProps) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Parse location
  const location = ticket.location as Address | null;

  // Get ticket images and evidence
  const ticketImages = ticket.media.filter((m) => m.source === MediaSource.TICKET);
  const userEvidence = ticket.media.filter((m) => m.source === MediaSource.EVIDENCE);

  // Build activity timeline
  const letterEvents: HistoryEvent[] = ticket.letters.map((l) => ({
    type: 'letter' as const,
    date: l.sentAt,
    data: l,
  }));
  const formEvents: HistoryEvent[] = ticket.forms.map((f) => ({
    type: 'form' as const,
    date: f.createdAt,
    data: f,
  }));
  const challengeEvents: HistoryEvent[] = ticket.challenges.map((c) => ({
    type: 'challenge' as const,
    date: c.submittedAt || c.createdAt,
    data: c,
  }));
  const historyEvents = [...letterEvents, ...formEvents, ...challengeEvents].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  // Calculate amounts and deadlines
  const currentAmount = getCurrentAmount(
    ticket.initialAmount,
    ticket.status,
    ticket.issuedAt,
  );
  const deadlineDays = getDeadlineDays(ticket.issuedAt);
  const discountDeadline = new Date(ticket.issuedAt);
  discountDeadline.setDate(discountDeadline.getDate() + 14);

  // Success prediction
  const successPrediction = ticket.prediction?.percentage ?? 50;

  // Check if user has address (for address prompt banner)
  const userAddress = ticket.vehicle.user.address as Address | null;
  const isPremiumTier = ticket.tier === TicketTier.PREMIUM;
  const shouldShowAddressPrompt = isPremiumTier && !userAddress;

  // Handlers
  const handleStatusChange = (newStatus: TicketStatus) => {
    startTransition(async () => {
      const result = await updateTicketStatus(ticket.id, newStatus);
      if (result.success) {
        toast.success('Ticket status updated');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update ticket status');
      }
    });
  };

  const handleUpgrade = async () => {
    const result = await createTicketCheckoutSession(TicketTier.PREMIUM, ticket.id);
    if (result?.url) {
      window.location.href = result.url;
    } else {
      toast.error('Failed to create checkout session');
    }
  };

  const handleEdit = () => {
    // Navigate to edit or open edit dialog
    // For now, scroll to ticket details section
    document.getElementById('ticket-details')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChallenge = () => {
    document.getElementById('challenge-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGenerateLetter = () => {
    document.getElementById('challenge-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMarkAsPaid = () => {
    handleStatusChange(TicketStatus.PAID);
  };

  const handleDelete = () => {
    // This would typically open a confirmation dialog
    // For now, we'll use the existing DeleteTicketDialog pattern
    toast.info('Delete functionality available via existing UI');
  };

  const handleReplaceTicketPhoto = () => {
    // TODO: Implement ticket photo replacement
    // This would open a file picker and upload a new ticket image
    toast.info('Photo replacement coming soon');
  };

  const handleUploadTicketPhoto = () => {
    // TODO: Implement ticket photo upload
    // This would open a file picker and upload a ticket image
    toast.info('Photo upload coming soon');
  };

  return (
    <div className="flex min-h-screen flex-col bg-light">
      {/* Page Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
        {/* Header */}
        <TicketDetailHeader
          pcnNumber={ticket.pcnNumber}
          status={ticket.status}
          issuer={ticket.issuer}
          onEdit={handleEdit}
          onChallenge={handleChallenge}
        />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left Column - 60% */}
          <div className="space-y-6 lg:col-span-3">
            {/* Ticket Details Card */}
            <div id="ticket-details">
              <TicketInfoCard
                pcnNumber={ticket.pcnNumber}
                issuedAt={ticket.issuedAt}
                contraventionCode={ticket.contraventionCode}
                location={location}
                vehicleReg={ticket.vehicle.registrationNumber}
                issuer={ticket.issuer}
                originalAmount={ticket.initialAmount}
                currentAmount={currentAmount}
                onEdit={handleEdit}
              />
            </div>

            {/* Ticket Photo Card */}
            <TicketPhotoCard
              images={ticketImages}
              onImageClick={setLightboxImage}
              onReplace={handleReplaceTicketPhoto}
              onUpload={handleUploadTicketPhoto}
            />

            {/* Location Card */}
            <LocationCard location={location} />

            {/* Evidence Card */}
            <EvidenceCard
              ticketId={ticket.id}
              evidence={userEvidence}
              onImageClick={setLightboxImage}
            />

            {/* PCN Journey Timeline */}
            <PCNJourneyTimeline
              currentStatus={ticket.status}
              issuerType={ticket.issuerType}
              onStatusChange={handleStatusChange}
            />

            {/* Appeal Letter Card (Conditional) */}
            {ticket.letters.length > 0 && (
              <AppealLetterCard
                letters={ticket.letters}
                onViewLetter={(letter) => {
                  // Open letter preview modal or navigate
                  if (letter.media.length > 0) {
                    window.open(letter.media[0].url, '_blank');
                  }
                }}
                onDownload={(letter) => {
                  if (letter.media.length > 0) {
                    window.open(letter.media[0].url, '_blank');
                  }
                }}
                onRegenerate={handleGenerateLetter}
              />
            )}
          </div>

          {/* Right Column - 40% */}
          <div className="space-y-6 lg:col-span-2">
            {/* Sticky container for right column on desktop */}
            <div className="lg:sticky lg:top-24 lg:space-y-6">
              {/* Address Prompt Banner (for PREMIUM users without address) */}
              {shouldShowAddressPrompt && <AddressPromptBanner />}

              {/* Success Prediction Card */}
              <SuccessPredictionCard
                tier={ticket.tier}
                successPrediction={successPrediction}
                potentialSavings={ticket.initialAmount / 2}
                onUpgrade={handleUpgrade}
              />

              {/* Actions Card */}
              <div id="challenge-section">
                <ActionsCard
                  status={ticket.status}
                  tier={ticket.tier}
                  hasLetter={ticket.letters.length > 0}
                  deadlineDays={deadlineDays}
                  onGenerateLetter={handleGenerateLetter}
                  onSubmitChallenge={handleChallenge}
                  onPreviewLetter={() => {
                    if (ticket.letters.length > 0 && ticket.letters[0].media.length > 0) {
                      window.open(ticket.letters[0].media[0].url, '_blank');
                    }
                  }}
                  onEdit={handleEdit}
                  onMarkAsPaid={handleMarkAsPaid}
                  onDelete={handleDelete}
                  onUpgrade={handleUpgrade}
                />
              </div>

              {/* Appeal Letter Summary (if generated) */}
              {ticket.letters.length > 0 && (
                <AppealLetterSummaryCard
                  letter={ticket.letters[0]}
                  onViewLetter={() => {
                    if (ticket.letters[0].media.length > 0) {
                      window.open(ticket.letters[0].media[0].url, '_blank');
                    }
                  }}
                  onDownload={() => {
                    if (ticket.letters[0].media.length > 0) {
                      window.open(ticket.letters[0].media[0].url, '_blank');
                    }
                  }}
                  onRegenerate={handleGenerateLetter}
                />
              )}

              {/* Deadline Alert */}
              <DeadlineAlertCard
                deadlineDays={deadlineDays}
                discountDeadline={discountDeadline}
              />

              {/* Activity Timeline */}
              <ActivityTimelineCard events={historyEvents} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Footer */}
      <MobileStickyFooter
        currentAmount={currentAmount}
        onPay={() => {
          // Navigate to payment or show payment options
          toast.info('Payment functionality coming soon');
        }}
        onChallenge={handleChallenge}
      />

      {/* Lightbox Modal */}
      <LightboxModal imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
};

export default TicketDetailPage;
