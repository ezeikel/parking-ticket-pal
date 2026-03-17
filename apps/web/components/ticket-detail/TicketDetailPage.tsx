'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { FLAG_SHOW_PAY_TICKET } from '@parking-ticket-pal/constants';
import {
  MediaSource,
  TicketStatus,
  TicketTier,
} from '@parking-ticket-pal/db/types';
import { Address } from '@parking-ticket-pal/types';
import { TicketWithRelations, HistoryEvent } from '@/types';
import { updateTicketStatus } from '@/app/actions/ticket';
import { createTicketCheckoutSession } from '@/app/actions/stripe';
import { initiateAutoChallenge } from '@/app/actions/autoChallenge';
import { generateChallengeLetter } from '@/app/actions/letter';
import { reExtractFromImage } from '@/app/actions/ocr';
import AddressPromptBanner from '@/components/AddressPromptBanner/AddressPromptBanner';
import AdBanner from '@/components/AdBanner/AdBanner';
import { getDisplayAmount } from '@/utils/getCurrentAmountDue';
import TicketDetailHeader from './TicketDetailHeader';
import TicketPhotoCard from './TicketPhotoCard';
import TicketInfoCard from './TicketInfoCard';
import LocationCard from './LocationCard';
import EvidenceCard from './EvidenceCard';
import UploadedLettersCard from './UploadedLettersCard';
import PCNJourneyTimeline from './PCNJourneyTimeline';
import AppealLetterCard from './AppealLetterCard';
import AppealLetterSummaryCard from './AppealLetterSummaryCard';
import GeneratedFormsCard from './GeneratedFormsCard';
import ChallengeLettersCard from './ChallengeLettersCard';
import SuccessPredictionCard from './SuccessPredictionCard';
import ActionsCard from './ActionsCard';
import DeadlineAlertCard from './DeadlineAlertCard';
import ActivityTimelineCard from './ActivityTimelineCard';
import MobileStickyFooter from './MobileStickyFooter';
import LightboxModal from './LightboxModal';
import LetterContentModal from './LetterContentModal';
import AutoChallengeDialog from './AutoChallengeDialog';
import GenerateLetterDialog from './GenerateLetterDialog';
import AutoChallengeStatusCard from './AutoChallengeStatusCard';
import ChallengeArgumentCard from './ChallengeArgumentCard';
import VerificationPrompt from './VerificationPrompt';
import LiveStatusCard from './LiveStatusCard';
import LegalFormsCard from './LegalFormsCard';
import DynamicStreetViewModal from './DynamicStreetViewModal';

type TicketDetailPageProps = {
  ticket: TicketWithRelations;
  showAds?: boolean;
};

const getDeadlineDays = (issuedAt: Date): number => {
  const issued = new Date(issuedAt);
  const deadline = new Date(issued);
  deadline.setDate(deadline.getDate() + 14);
  const now = new Date();
  return Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
};

// Type for letters with media (used for letter content modal)
type LetterWithMedia = {
  id: string;
  type: TicketWithRelations['letters'][0]['type'];
  sentAt: Date;
  summary: string | null;
  extractedText: string | null;
  media: Pick<TicketWithRelations['letters'][0]['media'][0], 'id' | 'url'>[];
};

const TicketDetailPage = ({
  ticket,
  showAds = false,
}: TicketDetailPageProps) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showPayTicket, setShowPayTicket] = useState(false);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<LetterWithMedia | null>(
    null,
  );
  const [isAutoChallengeDialogOpen, setIsAutoChallengeDialogOpen] =
    useState(false);
  const [isGenerateLetterDialogOpen, setIsGenerateLetterDialogOpen] =
    useState(false);
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  // For retry functionality
  const [retryChallengeId, setRetryChallengeId] = useState<string | null>(null);
  const [retryReason, setRetryReason] = useState<string | undefined>();
  const [retryCustomReason, setRetryCustomReason] = useState<
    string | undefined
  >();

  useEffect(
    () =>
      // onFeatureFlags fires immediately if flags are already loaded, and again on reload
      posthog.onFeatureFlags(() => {
        setShowPayTicket(
          posthog.isFeatureEnabled(FLAG_SHOW_PAY_TICKET) === true,
        );
      }),
    [],
  );

  // Helper to open dialog for retry
  const openAutoChallengeDialogForRetry = (
    challengeId: string,
    reason?: string,
    customReason?: string,
  ) => {
    setRetryChallengeId(challengeId);
    setRetryReason(reason);
    setRetryCustomReason(customReason);
    setIsAutoChallengeDialogOpen(true);
  };

  // Helper to reset retry state when dialog closes
  const handleAutoChallengeDialogChange = (open: boolean) => {
    setIsAutoChallengeDialogOpen(open);
    if (!open) {
      setRetryChallengeId(null);
      setRetryReason(undefined);
      setRetryCustomReason(undefined);
    }
  };

  // Parse location
  const location = ticket.location as Address | null;

  // Get ticket images and evidence
  const ticketImages = ticket.media.filter(
    (m) => m.source === MediaSource.TICKET,
  );
  const userEvidence = ticket.media.filter(
    (m) => m.source === MediaSource.EVIDENCE,
  );
  const streetViewImages = ticket.media.filter(
    (m) => m.source === ('STREET_VIEW' as MediaSource),
  );

  // Collect all image URLs for the lightbox carousel
  const allImages: string[] = [
    ...ticketImages.map((m) => m.url).filter(Boolean),
    ...userEvidence
      .filter((m) => m.url.match(/\.(jpeg|jpg|gif|png|webp)$/i))
      .map((m) => m.url),
    ...streetViewImages.map((m) => m.url).filter(Boolean),
    ...ticket.letters.flatMap((l) => l.media.map((m) => m.url)),
  ];

  const openLightbox = (imageUrl: string) => {
    const index = allImages.indexOf(imageUrl);
    setLightbox({ images: allImages, index: index >= 0 ? index : 0 });
  };

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
  const historyEvents = [
    ...letterEvents,
    ...formEvents,
    ...challengeEvents,
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate amounts and deadlines
  // Uses AmountIncrease records if available, otherwise falls back to standard calculation
  const currentAmount = getDisplayAmount(ticket);
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
    const result = await createTicketCheckoutSession(
      TicketTier.PREMIUM,
      ticket.id,
    );
    if (result?.url) {
      window.location.href = result.url;
    } else {
      toast.error('Failed to create checkout session');
    }
  };

  const handleEdit = () => {
    // Navigate to edit or open edit dialog
    // For now, scroll to ticket details section
    document
      .getElementById('ticket-details')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChallenge = () => {
    document
      .getElementById('challenge-section')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGenerateLetter = async (
    _reason: string,
    reasonLabel: string,
    customReason?: string,
  ) => {
    const toastId = toast.loading('Creating your challenge letter...');

    try {
      const result = await generateChallengeLetter(
        ticket.id,
        reasonLabel,
        customReason,
      );

      if (result && result.success) {
        toast.success(
          result.message ||
            'Your challenge letter is on the way! Check your inbox.',
          { id: toastId },
        );
        router.refresh();
      } else {
        toast.error(
          result?.message || 'Something went wrong. Please try again.',
          {
            id: toastId,
          },
        );
      }
    } catch {
      toast.error('Something went wrong. Please try again.', {
        id: toastId,
      });
    }
  };

  const handleOpenGenerateLetterDialog = () => {
    setIsGenerateLetterDialogOpen(true);
  };

  const handleMarkAsPaid = () => {
    handleStatusChange(TicketStatus.PAID);
  };

  const handleDelete = () => {
    // This would typically open a confirmation dialog
    // For now, we'll use the existing DeleteTicketDialog pattern
    toast.info('Delete functionality available via existing UI');
  };

  const handleAutoChallenge = async (
    reason: string,
    customReason?: string,
    existingChallengeId?: string,
  ) => {
    const toastId = toast.loading('Starting challenge...');

    try {
      const result = await initiateAutoChallenge(
        ticket.id,
        reason,
        customReason,
        existingChallengeId,
      );

      if (result.success) {
        switch (result.status) {
          case 'started':
            toast.success(
              'Challenge automation started! Tracking progress...',
              { id: toastId },
            );
            break;
          case 'submitted':
            toast.success('Challenge submitted successfully!', { id: toastId });
            break;
          case 'submitting':
            toast.success(
              "Challenge is being submitted. You'll be notified when complete.",
              { id: toastId },
            );
            break;
          case 'generating_automation':
            toast.info(result.message, { id: toastId });
            break;
          case 'automation_pending_review':
            toast.info(result.message, { id: toastId });
            break;
          case 'unsupported':
            toast.info(result.message, { id: toastId });
            break;
          default:
            toast.success(result.message, { id: toastId });
        }
        router.refresh();
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch {
      toast.error('Failed to start challenge. Please try again.', {
        id: toastId,
      });
    }
  };

  const [isReExtracting, setIsReExtracting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReExtract = async () => {
    setIsReExtracting(true);
    try {
      const result = await reExtractFromImage(ticket.id);
      if (result.success) {
        if (result.updatedFields && result.updatedFields.length > 0) {
          toast.success(`Updated: ${result.updatedFields.join(', ')}`);
        } else {
          toast.info(result.message);
        }
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to re-extract data');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsReExtracting(false);
    }
  };

  const handleReplaceTicketPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleUploadTicketPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Use OCR to process and get temp URL
      const { extractOCRTextWithOpenAI } = await import('@/app/actions/ocr');
      const ocrResult = await extractOCRTextWithOpenAI(formData);

      if (
        !ocrResult.success ||
        !ocrResult.imageUrl ||
        !ocrResult.tempImagePath
      ) {
        toast.error('Failed to process image');
        return;
      }

      // If replacing, delete existing TICKET media
      if (ticketImages.length > 0) {
        const res = await fetch(`/api/tickets/${ticket.id}/image/replace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tempImageUrl: ocrResult.imageUrl,
            tempImagePath: ocrResult.tempImagePath,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        // Create new media
        const res = await fetch(`/api/tickets/${ticket.id}/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tempImageUrl: ocrResult.imageUrl,
            tempImagePath: ocrResult.tempImagePath,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }

      toast.success('Photo updated');
      router.refresh();
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-light">
      {/* Page Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-6 md:px-6">
        {/* Header */}
        <TicketDetailHeader
          pcnNumber={ticket.pcnNumber}
          status={ticket.status}
          verified={ticket.verified}
          issuer={ticket.issuer ?? ''}
          onEdit={handleEdit}
          onChallenge={handleChallenge}
        />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left Column - 60% */}
          <div className="min-w-0 space-y-6 lg:col-span-3">
            {/* Ticket Details Card */}
            <div id="ticket-details">
              <TicketInfoCard
                pcnNumber={ticket.pcnNumber}
                issuedAt={ticket.issuedAt}
                contraventionCode={ticket.contraventionCode}
                location={location}
                vehicleReg={ticket.vehicle.registrationNumber}
                issuer={ticket.issuer ?? ''}
                originalAmount={ticket.initialAmount ?? 0}
                currentAmount={currentAmount}
                onEdit={handleEdit}
              />
            </div>

            {/* Incomplete Data Banner — re-extract from ticket photo */}
            {(!ticket.contraventionCode ||
              !ticket.issuer ||
              !location?.line1 ||
              !ticket.initialAmount) &&
              ticketImages.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div>
                    <p className="font-semibold text-amber-800">
                      Incomplete ticket details
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      Some fields are missing. Re-extract from the ticket photo
                      to fill them in.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-4 shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    onClick={handleReExtract}
                    disabled={isReExtracting}
                  >
                    {isReExtracting ? 'Extracting…' : 'Re-extract'}
                  </button>
                </div>
              )}

            {/* Verification Prompt - show when ticket has issuer but isn't verified */}
            {!ticket.verified && ticket.issuer && (
              <VerificationPrompt
                ticketId={ticket.id}
                pcnNumber={ticket.pcnNumber}
              />
            )}

            {/* Live Portal Status Card - PREMIUM only */}
            <LiveStatusCard
              ticketId={ticket.id}
              tier={ticket.tier}
              issuer={ticket.issuer ?? ''}
              lastCheck={
                ticket.verification?.type === 'TICKET' &&
                ticket.verification.metadata
                  ? {
                      portalStatus:
                        ((
                          ticket.verification.metadata as Record<
                            string,
                            unknown
                          >
                        ).portalStatus as string) || '',
                      mappedStatus: (
                        ticket.verification.metadata as Record<string, unknown>
                      ).mappedStatus as string | null,
                      outstandingAmount:
                        ((
                          ticket.verification.metadata as Record<
                            string,
                            unknown
                          >
                        ).outstandingAmount as number) || 0,
                      canChallenge:
                        ((
                          ticket.verification.metadata as Record<
                            string,
                            unknown
                          >
                        ).canChallenge as boolean) || false,
                      canPay:
                        ((
                          ticket.verification.metadata as Record<
                            string,
                            unknown
                          >
                        ).canPay as boolean) || false,
                      screenshotUrl:
                        ((
                          ticket.verification.metadata as Record<
                            string,
                            unknown
                          >
                        ).screenshotUrl as string) || '',
                      checkedAt:
                        ((
                          ticket.verification.metadata as Record<
                            string,
                            unknown
                          >
                        ).checkedAt as string) ||
                        ticket.verification.verifiedAt?.toISOString() ||
                        '',
                    }
                  : null
              }
              onViewScreenshot={openLightbox}
              onStatusChange={() => {
                // Page will revalidate automatically after status update
              }}
            />

            {/* Hidden file input for photo upload/replace */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/webp"
              className="hidden"
              onChange={handleFileSelected}
            />

            {/* Ticket Photo Card */}
            <TicketPhotoCard
              images={ticketImages}
              onImageClick={openLightbox}
              onReplace={handleReplaceTicketPhoto}
              onUpload={handleUploadTicketPhoto}
              isUploading={isUploadingPhoto}
            />

            {/* Location Card */}
            <LocationCard
              location={location}
              streetViewImages={streetViewImages}
              onImageClick={openLightbox}
              onLookAround={
                location?.coordinates?.latitude &&
                location?.coordinates?.longitude
                  ? () => setStreetViewOpen(true)
                  : undefined
              }
            />

            {/* Evidence Card */}
            <EvidenceCard
              ticketId={ticket.id}
              evidence={userEvidence}
              onImageClick={openLightbox}
            />

            {/* Challenge Argument Generator */}
            <ChallengeArgumentCard
              ticketId={ticket.id}
              issuerType={ticket.issuerType}
              tier={ticket.tier}
              existingChallenge={
                ticket.challenges[0]
                  ? {
                      id: ticket.challenges[0].id,
                      reason: ticket.challenges[0].reason,
                      customReason: ticket.challenges[0].customReason,
                      challengeText: ticket.challenges[0].challengeText,
                      additionalInfo: ticket.challenges[0].additionalInfo,
                      challengeTextGeneratedAt:
                        ticket.challenges[0].challengeTextGeneratedAt,
                    }
                  : null
              }
              onSendLetter={handleOpenGenerateLetterDialog}
              onAutoChallenge={() => setIsAutoChallengeDialogOpen(true)}
              onUpgrade={handleUpgrade}
            />

            {/* Uploaded Letters Card (letters received from council) */}
            <UploadedLettersCard
              ticketId={ticket.id}
              letters={ticket.letters}
              onViewLetter={setSelectedLetter}
              onImageClick={openLightbox}
            />

            {/* PCN Journey Timeline */}
            <PCNJourneyTimeline
              currentStatus={ticket.status}
              issuerType={ticket.issuerType}
              onStatusChange={handleStatusChange}
            />

            {/* Legal Forms Card - stage-based form generation */}
            <LegalFormsCard
              ticket={ticket}
              hasSignature={!!ticket.vehicle.user.signatureUrl}
              onUpgrade={handleUpgrade}
            />

            {/* Challenge Letters Card (generated appeal letters) */}
            {ticket.challenges.length > 0 && (
              <ChallengeLettersCard
                challenges={ticket.challenges}
                onRegenerate={handleOpenGenerateLetterDialog}
              />
            )}

            {/* Auto Challenge Status Card - show latest AUTO_CHALLENGE */}
            {(() => {
              const latestAutoChallenge = ticket.challenges
                .filter((c) => c.type === 'AUTO_CHALLENGE')
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )[0];

              if (!latestAutoChallenge) return null;

              return (
                <AutoChallengeStatusCard
                  challengeId={latestAutoChallenge.id}
                  initialStatus={latestAutoChallenge.status}
                  reason={latestAutoChallenge.reason}
                  createdAt={latestAutoChallenge.createdAt}
                  onRetry={() => {
                    // Open dialog with pre-filled reason for retry
                    openAutoChallengeDialogForRetry(
                      latestAutoChallenge.id,
                      latestAutoChallenge.reason,
                      latestAutoChallenge.customReason || undefined,
                    );
                  }}
                  onViewScreenshots={(urls) => {
                    if (urls.length > 0) {
                      setLightbox({ images: urls, index: 0 });
                    }
                  }}
                />
              );
            })()}

            {/* Appeal Letter Card (incoming council letters) */}
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
                onRegenerate={handleOpenGenerateLetterDialog}
              />
            )}

            {/* Generated Forms Card (Conditional) */}
            {ticket.forms.length > 0 && (
              <GeneratedFormsCard forms={ticket.forms} />
            )}
          </div>

          {/* Right Column - 40% */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* Sticky container for right column on desktop */}
            <div className="min-w-0 space-y-6 lg:sticky lg:top-24">
              {/* Address Prompt Banner (for PREMIUM users without address) */}
              {shouldShowAddressPrompt && <AddressPromptBanner />}

              {/* Success Prediction Card */}
              <SuccessPredictionCard
                tier={ticket.tier}
                successPrediction={successPrediction}
                potentialSavings={(ticket.initialAmount ?? 0) / 2}
                onUpgrade={handleUpgrade}
                numberOfCases={ticket.prediction?.numberOfCases ?? undefined}
                metadata={
                  ticket.prediction?.metadata as {
                    dataSource: string;
                    statsLevel:
                      | 'issuer_contravention'
                      | 'contravention'
                      | 'baseline';
                    numberOfCases?: number;
                  } | null
                }
                issuerName={ticket.issuer ?? undefined}
                contraventionCode={ticket.contraventionCode}
              />

              {/* Actions Card */}
              <div id="challenge-section">
                <ActionsCard
                  status={ticket.status}
                  tier={ticket.tier}
                  hasLetter={ticket.letters.length > 0}
                  deadlineDays={deadlineDays}
                  showPay={showPayTicket}
                  currentAmount={currentAmount}
                  onPay={() => toast.info('Pay feature coming soon')}
                  onAutoChallenge={() => setIsAutoChallengeDialogOpen(true)}
                  onGenerateLetter={handleOpenGenerateLetterDialog}
                  onPreviewLetter={() => {
                    if (
                      ticket.letters.length > 0 &&
                      ticket.letters[0].media.length > 0
                    ) {
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
                  onRegenerate={handleOpenGenerateLetterDialog}
                />
              )}

              {/* Deadline Alert */}
              <DeadlineAlertCard
                deadlineDays={deadlineDays}
                discountDeadline={discountDeadline}
              />

              {/* Activity Timeline */}
              <ActivityTimelineCard events={historyEvents} />

              {/* Ad Banner */}
              {showAds &&
                process.env.NEXT_PUBLIC_ADSENSE_SLOT_TICKET_DETAIL && (
                  <AdBanner
                    slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TICKET_DETAIL}
                    format="rectangle"
                    className="mt-6"
                  />
                )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Footer */}
      <MobileStickyFooter
        showPay={showPayTicket}
        currentAmount={currentAmount}
        onPay={() => {
          // Navigate to payment or show payment options
          toast.info('Payment functionality coming soon');
        }}
        onChallenge={handleChallenge}
      />

      {/* Lightbox Modal */}
      <LightboxModal
        images={lightbox?.images ?? []}
        index={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
      />

      {/* Letter Content Modal */}
      <LetterContentModal
        letter={selectedLetter}
        onClose={() => setSelectedLetter(null)}
        onViewImage={(url) => {
          setSelectedLetter(null);
          openLightbox(url);
        }}
      />

      {/* Auto Challenge Dialog */}
      <AutoChallengeDialog
        open={isAutoChallengeDialogOpen}
        onOpenChange={handleAutoChallengeDialogChange}
        issuerName={ticket.issuer ?? ''}
        predictionMetadata={
          ticket.prediction?.metadata as
            | import('@/services/prediction-service').PredictionMetadata
            | null
        }
        onSubmit={handleAutoChallenge}
        existingChallengeId={retryChallengeId || undefined}
        initialReason={retryReason}
        initialCustomReason={retryCustomReason}
      />

      {/* Street View Modal */}
      {location?.coordinates?.latitude && location?.coordinates?.longitude && (
        <DynamicStreetViewModal
          open={streetViewOpen}
          onOpenChange={setStreetViewOpen}
          latitude={location.coordinates.latitude}
          longitude={location.coordinates.longitude}
        />
      )}

      {/* Generate Letter Dialog */}
      <GenerateLetterDialog
        open={isGenerateLetterDialogOpen}
        onOpenChange={setIsGenerateLetterDialogOpen}
        issuerType={ticket.issuerType}
        predictionMetadata={
          ticket.prediction?.metadata as
            | import('@/services/prediction-service').PredictionMetadata
            | null
        }
        onSubmit={handleGenerateLetter}
      />
    </div>
  );
};

export default TicketDetailPage;
