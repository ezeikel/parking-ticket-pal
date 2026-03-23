import { View, Text, ScrollView, useWindowDimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faTriangleExclamation, faBadgeCheck } from '@fortawesome/pro-solid-svg-icons';
import { faCopy } from '@fortawesome/pro-regular-svg-icons';
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet from '@gorhom/bottom-sheet';
import ImageLightbox from '@/components/ImageLightbox';
import useTicket from '@/hooks/api/useTicket';
import { Address } from '@parking-ticket-pal/types';
import {
  getStatusConfig,
  getDeadlineDays,
  isTerminalStatus,
  getDisplayAmount,
} from '@/constants/ticket-status';
import { MAX_CONTENT_WIDTH } from '@/constants/layout';
import { toast } from '@/lib/toast';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import PremiumActionsBottomSheet from '@/components/PremiumActionsBottomSheet';
import type { PremiumAction } from '@/components/PremiumActionsBottomSheet';
import ChallengeWizard from '@/components/ChallengeWizard/ChallengeWizard';
import AutoChallengeWizard from '@/components/AutoChallengeWizard/AutoChallengeWizard';
import FormsBottomSheet from '@/components/FormsBottomSheet';
import { FormType } from '@/constants/challenges';
import { usePurchases } from '@/contexts/purchases';
import { AdBanner } from '@/components/AdBanner';
import TicketInfoCard from '@/components/ticket-detail/TicketInfoCard';
import LiveStatusCard from '@/components/ticket-detail/LiveStatusCard';
import TicketPhotoCard from '@/components/ticket-detail/TicketPhotoCard';
import LocationCard from '@/components/ticket-detail/LocationCard';
import EvidenceCard from '@/components/ticket-detail/EvidenceCard';
import LettersReceivedCard from '@/components/ticket-detail/LettersReceivedCard';
import SuccessPredictionCard from '@/components/ticket-detail/SuccessPredictionCard';
import ActionsCard from '@/components/ticket-detail/ActionsCard';
import DeadlineAlertCard from '@/components/ticket-detail/DeadlineAlertCard';
import VerificationPrompt from '@/components/ticket-detail/VerificationPrompt';
import TicketJourneyCard from '@/components/ticket-detail/TicketJourneyCard';
import ChallengeArgumentCard from '@/components/ticket-detail/ChallengeArgumentCard';
import LegalFormsCard from '@/components/ticket-detail/LegalFormsCard';
import ActivityTimelineCard, {
  type TimelineEvent,
} from '@/components/ticket-detail/ActivityTimelineCard';
import { useFeatureFlag } from 'posthog-react-native';
import { FLAG_SHOW_PAY_TICKET } from '@parking-ticket-pal/constants';
import StickyBottomCTA from '@/components/ticket-detail/StickyBottomCTA';
import UpgradeNudgeSheet from '@/components/ticket-detail/UpgradeNudgeSheet';
import useReExtract from '@/hooks/api/useReExtract';
import { useAnalytics } from '@/lib/analytics';
import * as ImagePicker from 'expo-image-picker';
import { processImageWithOCR, addImageToTicket } from '@/api';
import StreetViewModal from '@/components/StreetViewModal';

const padding = 16;

export default function TicketDetailScreen() {
  const { width } = useWindowDimensions();
  const screenWidth = width - padding * 2;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useTicket(id!);
  const { hasPremiumAccess } =
    usePurchases();
  const showPayTicket = useFeatureFlag(FLAG_SHOW_PAY_TICKET) === true;

  const reExtract = useReExtract();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePickAndUploadPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return;

    setIsUploadingPhoto(true);
    try {
      const ocrResult = await processImageWithOCR(
        `data:image/jpeg;base64,${result.assets[0].base64}`,
      );

      if (!ocrResult.success || !ocrResult.imageUrl || !ocrResult.tempImagePath) {
        toast.error('Upload failed', 'Could not process image');
        return;
      }

      await addImageToTicket(id!, {
        tempImageUrl: ocrResult.imageUrl,
        tempImagePath: ocrResult.tempImagePath,
      });

      toast.success('Photo uploaded');
      refetch();
    } catch {
      toast.error('Upload failed', 'Please try again');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Bottom sheet refs
  const formsSheetRef = useRef<BottomSheet>(null);

  const [isPremiumActionsVisible, setIsPremiumActionsVisible] = useState(false);
  const [isChallengeLetterVisible, setIsChallengeLetterVisible] = useState(false);
  const [isAutoChallengeVisible, setIsAutoChallengeVisible] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(
    null,
  );
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const { trackEvent } = useAnalytics();

  // Show upgrade nudge for FREE tickets on first visit
  useEffect(() => {
    if (!data?.ticket || hasPremiumAccess) return;
    const ticket = data.ticket as any;
    if (ticket.tier === 'PREMIUM') return;

    const key = `upgrade_nudge_dismissed_${id}`;
    AsyncStorage.getItem(key).then((dismissed) => {
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowUpgradeNudge(true);
          trackEvent('upgrade_nudge_shown', { ticket_id: id });
        }, 1500);
        return () => clearTimeout(timer);
      }
    });
  }, [data?.ticket, hasPremiumAccess, id]);

  const handleUpgradeNudgeDismiss = useCallback(() => {
    setShowUpgradeNudge(false);
    AsyncStorage.setItem(`upgrade_nudge_dismissed_${id}`, 'true');
    trackEvent('upgrade_nudge_dismissed', { ticket_id: id });
  }, [id, trackEvent]);

  const handleUpgradeNudgeTap = useCallback(() => {
    setShowUpgradeNudge(false);
    trackEvent('upgrade_nudge_upgrade_tapped', { ticket_id: id });
    router.push({
      pathname: '/(authenticated)/paywall',
      params: { mode: 'ticket_upgrades', ticketId: id, source: 'upgrade_nudge' },
    });
  }, [id, trackEvent]);

  // Collect all image URLs for lightbox (including letter images)
  // Must be before early returns to keep hook order consistent
  const allImages = useMemo(() => {
    const ticket = data?.ticket;
    if (!ticket) return [];
    const media = ticket.media || [];
    const tImages = media.filter((m: any) => m.source === 'TICKET' || !m.source);
    const uEvidence = media.filter((m: any) => m.source === 'EVIDENCE');
    const svImages = media.filter((m: any) => m.source === 'STREET_VIEW');
    const letterMediaUrls = ((ticket as any)?.letters || []).flatMap(
      (l: any) => (l.media || []).filter(
        (m: any) => /\.(jpeg|jpg|gif|png|webp)$/i.test(m.url),
      ).map((m: any) => m.url),
    );
    const images = [
      ...tImages.map((m: any) => m.url),
      ...uEvidence
        .filter((m: any) => /\.(jpeg|jpg|gif|png|webp)$/i.test(m.url))
        .map((m: any) => m.url),
      ...svImages.map((m: any) => m.url),
      ...letterMediaUrls,
    ];
    return images.filter(Boolean) as string[];
  }, [data?.ticket]);

  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);

  const handlePremiumActionSelect = (action: PremiumAction) => {
    setIsPremiumActionsVisible(false);
    // Use setTimeout to let modal dismiss before opening next modal/sheet
    setTimeout(() => {
      if (action === 'auto-challenge') {
        setIsAutoChallengeVisible(true);
      } else if (action === 'challenge-letter') {
        setIsChallengeLetterVisible(true);
      }
    }, 300);
  };

  const handleSuccess = () => {
    setIsChallengeLetterVisible(false);
    setIsAutoChallengeVisible(false);
    formsSheetRef.current?.close();
    refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          size={40}
          color="#717171"
          style={{ marginBottom: 16 }}
        />
        <Text className="font-jakarta-semibold text-lg text-dark text-center mb-2">
          Something went wrong
        </Text>
        <Text className="font-jakarta text-sm text-gray text-center mb-6">
          {"We couldn't load this ticket. Please try again."}
        </Text>
        <SquishyPressable onPress={() => refetch()}>
          <View className="bg-dark rounded-xl px-6 py-3">
            <Text className="font-jakarta-semibold text-white text-sm">
              Try Again
            </Text>
          </View>
        </SquishyPressable>
      </SafeAreaView>
    );
  }

  if (!data?.ticket) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text className="text-gray">Ticket not found</Text>
      </SafeAreaView>
    );
  }

  const { ticket } = data;
  const ticketData = ticket as any;
  const location = ticketData.location as Address | null;
  const statusConfig = getStatusConfig(ticket.status);
  const deadlineDays = getDeadlineDays(ticket.issuedAt);
  const isTerminal = isTerminalStatus(ticket.status);
  const currentAmount = getDisplayAmount(ticket);

  const hasPremiumFeatures =
    ticketData.tier === 'PREMIUM' ||
    hasPremiumAccess;

  // Separate ticket images from evidence and street view
  const ticketImages = (ticket.media || []).filter(
    (m: any) => m.source === 'TICKET' || !m.source,
  );
  const userEvidence = (ticket.media || []).filter(
    (m: any) => m.source === 'EVIDENCE',
  );
  const streetViewImages = (ticket.media || []).filter(
    (m: any) => m.source === 'STREET_VIEW',
  );


  const openLightbox = (imageUrl: string) => {
    const index = allImages.indexOf(imageUrl);
    setLightbox({ images: allImages, index: index >= 0 ? index : 0 });
  };

  // Build activity timeline from available data
  const timelineEvents: TimelineEvent[] = [];
  if (ticketData.challenges) {
    for (const c of ticketData.challenges) {
      timelineEvents.push({
        type: 'challenge',
        date: new Date(c.submittedAt || c.createdAt),
        title: `Challenge ${(c.status || '').toLowerCase()}`,
        description: c.reason,
      });
    }
  }
  if (ticketData.letters) {
    for (const l of ticketData.letters) {
      timelineEvents.push({
        type: 'letter',
        date: new Date(l.sentAt || l.createdAt),
        title: `Appeal letter ${(l.type || '').toLowerCase().replace(/_/g, ' ')}`,
        description: l.summary,
      });
    }
  }
  if (ticketData.forms) {
    for (const f of ticketData.forms) {
      timelineEvents.push({
        type: 'form',
        date: new Date(f.createdAt),
        title: `${f.formType} form generated`,
      });
    }
  }
  timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Handlers for bottom CTA
  const handlePay = () => {
    if (ticket.paymentLink) {
      Linking.openURL(ticket.paymentLink);
    } else {
      toast.info('Payment', 'Payment link not available for this ticket.');
    }
  };

  const handleChallenge = () => {
    if (hasPremiumFeatures) {
      setIsPremiumActionsVisible(true);
    } else {
      router.push({
        pathname: '/(authenticated)/paywall' as any,
        params: { mode: 'ticket_upgrades', ticketId: ticket.id },
      });
    }
  };

  return (
    <View className="flex-1 bg-white">
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        className="border-b border-border pb-4"
        style={{
          marginTop: padding,
          width: screenWidth,
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
        }}
      >
        <View className="flex-row items-center mb-4">
          <SquishyPressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <View className="flex-row items-center">
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#717171" />
              <Text className="ml-2 font-jakarta text-gray">Back</Text>
            </View>
          </SquishyPressable>
        </View>

        {/* PCN + copy + status badge */}
        <View className="flex-row items-center gap-2 mb-1">
          <SquishyPressable
            onPress={async () => {
              await Clipboard.setStringAsync(ticketData.pcnNumber);
              toast.success('PCN copied to clipboard');
            }}
            accessibilityRole="button"
            accessibilityLabel="Copy PCN to clipboard"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-jakarta-bold text-dark">
                {ticketData.pcnNumber}
              </Text>
              <FontAwesomeIcon icon={faCopy} size={16} color="#717171" />
            </View>
          </SquishyPressable>
          {ticketData.verified && (
            <FontAwesomeIcon icon={faBadgeCheck} size={22} color="#1abc9c" />
          )}
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: statusConfig.bgColor }}
          >
            <Text
              className="font-jakarta-medium text-xs"
              style={{ color: statusConfig.textColor }}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text className="font-jakarta text-gray">{ticketData.issuer}</Text>
      </View>

      {/* Ad Banner - under header */}
      <AdBanner placement="ticket-detail" />

      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: padding,
          paddingBottom: padding * 2,
          width: screenWidth,
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
        }}
      >
        {/* 1. Ticket Info Card */}
        <TicketInfoCard ticket={ticket} />

        {/* Verification Prompt - show when ticket has issuer but isn't verified */}
        {!ticketData.verified && ticketData.issuer && (
          <VerificationPrompt
            ticketId={ticket.id}
            pcnNumber={ticketData.pcnNumber}
            onVerified={refetch}
          />
        )}

        {/* 2. Live Portal Status */}
        <LiveStatusCard
          ticketId={ticket.id}
          isPremium={hasPremiumFeatures}
          issuer={ticket.issuer}
          lastCheck={ticketData.verification?.metadata ?? null}
        />

        {/* Incomplete Data Banner */}
        {(!ticketData.contraventionCode || !ticketData.issuer || !location?.line1 || !ticketData.initialAmount) &&
          ticketImages.length > 0 && (
            <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4">
              <Text className="font-jakarta-semibold text-amber-800">
                Incomplete ticket details
              </Text>
              <Text className="font-jakarta text-sm text-amber-700 mt-1">
                Some fields are missing. Re-extract from the ticket photo to fill them in.
              </Text>
              <SquishyPressable
                onPress={() => {
                  reExtract.mutate(ticket.id, {
                    onSuccess: (data) => {
                      if (data.updatedFields?.length) {
                        toast.success(`Updated: ${data.updatedFields.join(', ')}`);
                      } else {
                        toast.info('Re-extract', data.message || 'No new data found');
                      }
                    },
                    onError: () => {
                      toast.error('Re-extract failed', 'Please try again');
                    },
                  });
                }}
                disabled={reExtract.isPending}
              >
                <View className="bg-amber-600 rounded-xl px-4 py-2.5 mt-3 self-start">
                  <Text className="font-jakarta-semibold text-white text-sm">
                    {reExtract.isPending ? 'Extracting…' : 'Re-extract'}
                  </Text>
                </View>
              </SquishyPressable>
            </View>
          )}

        {/* 3. Ticket Photo */}
        <TicketPhotoCard
          media={ticketImages}
          onImagePress={openLightbox}
          onReplace={handlePickAndUploadPhoto}
          onUpload={handlePickAndUploadPhoto}
          isUploading={isUploadingPhoto}
        />

        {/* 4. Ticket Location */}
        <LocationCard
          location={location}
          streetViewImages={streetViewImages}
          onImagePress={openLightbox}
          onLookAround={
            location?.coordinates?.latitude && location?.coordinates?.longitude
              ? () => setStreetViewOpen(true)
              : undefined
          }
        />

        {/* 5. Evidence */}
        <EvidenceCard
          ticketId={ticket.id}
          evidence={userEvidence}
          onImagePress={openLightbox}
          onRefetch={refetch}
        />

        {/* Challenge Argument Generator */}
        <ChallengeArgumentCard
          ticketId={ticket.id}
          issuerType={ticketData.issuerType}
          isPremium={hasPremiumFeatures}
          existingChallenge={ticketData.challenges?.[0] || null}
          onSendLetter={() => setIsChallengeLetterVisible(true)}
          onAutoChallenge={() => setIsAutoChallengeVisible(true)}
          onRefresh={refetch}
          onUpgrade={() => {
            router.push({
              pathname: '/(authenticated)/paywall' as any,
              params: { mode: 'ticket_upgrades', ticketId: ticket.id },
            });
          }}
        />

        {/* Letters Received */}
        {ticketData.letters && ticketData.letters.length > 0 && (
          <LettersReceivedCard
            letters={ticketData.letters}
            onImagePress={openLightbox}
          />
        )}

        {/* 6. Success Prediction */}
        <SuccessPredictionCard
          ticket={ticket}
          isPremium={hasPremiumFeatures}
        />

        {/* 7. Actions Card */}
        <ActionsCard
          ticket={ticket}
          isPremium={hasPremiumFeatures}
          isStandardOnly={false}
          onOpenPremiumActions={() =>
            setIsPremiumActionsVisible(true)
          }
          onOpenChallengeLetter={() =>
            setIsChallengeLetterVisible(true)
          }
          onRefetch={refetch}
        />

        {/* 8. Deadline Alert */}
        {!isTerminal && <DeadlineAlertCard daysRemaining={deadlineDays} />}

        {/* 9. Ticket Journey */}
        <TicketJourneyCard
          currentStatus={ticket.status}
          issuerType={ticket.issuerType}
        />

        {/* 10. Legal Forms */}
        <LegalFormsCard
          isPremium={hasPremiumFeatures}
          issuerType={ticketData.issuerType}
          onSelectForm={(formType) => {
            setSelectedFormType(formType);
            formsSheetRef.current?.snapToIndex(0);
          }}
          onUpgrade={() => {
            router.push({
              pathname: '/(authenticated)/paywall' as any,
              params: { mode: 'ticket_upgrades', ticketId: ticket.id },
            });
          }}
        />

        {/* 11. Activity Timeline */}
        <ActivityTimelineCard events={timelineEvents} />
      </ScrollView>
    </SafeAreaView>

      {/* Sticky Bottom CTA - Pay & Challenge (outside SafeAreaView so it handles its own bottom inset) */}
      {!isTerminal && (
        <StickyBottomCTA
          showPay={showPayTicket}
          currentAmount={currentAmount}
          onPay={handlePay}
          onChallenge={handleChallenge}
        />
      )}

      {/* Bottom Sheets */}
      <PremiumActionsBottomSheet
        visible={isPremiumActionsVisible}
        onActionSelect={handlePremiumActionSelect}
        onClose={() => setIsPremiumActionsVisible(false)}
      />

      <AutoChallengeWizard
        visible={isAutoChallengeVisible}
        ticketId={ticket.id}
        issuerName={ticketData.issuer || 'the issuer'}
        issuerType={ticketData.issuerType}
        onSuccess={handleSuccess}
        onClose={() => setIsAutoChallengeVisible(false)}
      />

      <ChallengeWizard
        visible={isChallengeLetterVisible}
        pcnNumber={ticketData.pcnNumber}
        ticketId={ticket.id}
        issuerType={ticketData.issuerType}
        contraventionCode={ticketData.contraventionCode}
        prediction={ticketData.prediction}
        onSuccess={handleSuccess}
        onClose={() => setIsChallengeLetterVisible(false)}
      />

      <FormsBottomSheet
        ref={formsSheetRef}
        pcnNumber={ticketData.pcnNumber}
        formType={selectedFormType || 'TE7'}
        onSuccess={handleSuccess}
      />

      {/* Street View Modal */}
      {location?.coordinates?.latitude && location?.coordinates?.longitude && (
        <StreetViewModal
          visible={streetViewOpen}
          onClose={() => setStreetViewOpen(false)}
          latitude={location.coordinates.latitude}
          longitude={location.coordinates.longitude}
        />
      )}

      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Upgrade Nudge (first visit, FREE tickets only) */}
      <UpgradeNudgeSheet
        visible={showUpgradeNudge}
        onUpgrade={handleUpgradeNudgeTap}
        onClose={handleUpgradeNudgeDismiss}
        daysUntilDiscount={deadlineDays}
      />
    </View>
  );
}
