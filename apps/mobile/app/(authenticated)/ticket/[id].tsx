import { View, Text, ScrollView, useWindowDimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faTriangleExclamation } from '@fortawesome/pro-solid-svg-icons';
import { useRef, useCallback, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
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
import ChallengeLetterBottomSheet from '@/components/ChallengeLetterBottomSheet';
import FormsBottomSheet from '@/components/FormsBottomSheet';
import { FormType } from '@/constants/challenges';
import { usePurchases } from '@/contexts/purchases';
import { AdBanner } from '@/components/AdBanner';
import TicketInfoCard from '@/components/ticket-detail/TicketInfoCard';
import LiveStatusCard from '@/components/ticket-detail/LiveStatusCard';
import TicketPhotoCard from '@/components/ticket-detail/TicketPhotoCard';
import LocationCard from '@/components/ticket-detail/LocationCard';
import EvidenceCard from '@/components/ticket-detail/EvidenceCard';
import SuccessPredictionCard from '@/components/ticket-detail/SuccessPredictionCard';
import ActionsCard from '@/components/ticket-detail/ActionsCard';
import DeadlineAlertCard from '@/components/ticket-detail/DeadlineAlertCard';
import TicketJourneyCard from '@/components/ticket-detail/TicketJourneyCard';
import ActivityTimelineCard, {
  type TimelineEvent,
} from '@/components/ticket-detail/ActivityTimelineCard';
import StickyBottomCTA from '@/components/ticket-detail/StickyBottomCTA';

const padding = 16;

export default function TicketDetailScreen() {
  const { width } = useWindowDimensions();
  const screenWidth = width - padding * 2;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useTicket(id!);
  const { hasPremiumAccess } =
    usePurchases();

  // Bottom sheet refs
  const challengeLetterSheetRef = useRef<BottomSheet>(null);
  const formsSheetRef = useRef<BottomSheet>(null);

  const [isPremiumActionsVisible, setIsPremiumActionsVisible] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(
    null,
  );

  const handlePremiumActionSelect = (
    action: 'challenge-letter' | FormType,
  ) => {
    setIsPremiumActionsVisible(false);
    // Use setTimeout to let modal dismiss before opening bottom sheet
    setTimeout(() => {
      if (action === 'challenge-letter') {
        challengeLetterSheetRef.current?.snapToIndex(0);
      } else {
        setSelectedFormType(action);
        formsSheetRef.current?.snapToIndex(0);
      }
    }, 300);
  };

  const handleSuccess = () => {
    challengeLetterSheetRef.current?.close();
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

  // Separate ticket images from evidence
  const ticketImages = (ticket.media || []).filter(
    (m: any) => m.source === 'TICKET' || !m.source,
  );
  const userEvidence = (ticket.media || []).filter(
    (m: any) => m.source === 'EVIDENCE',
  );

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

        {/* PCN + status badge */}
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-2xl font-jakarta-bold text-dark">
            {ticketData.pcnNumber}
          </Text>
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

        {/* 2. Live Portal Status */}
        <LiveStatusCard
          ticketId={ticket.id}
          isPremium={hasPremiumFeatures}
          issuer={ticket.issuer}
          lastCheck={ticketData.verification?.metadata ?? null}
        />

        {/* 3. Ticket Photo */}
        {ticketImages.length > 0 && <TicketPhotoCard media={ticketImages} />}

        {/* 4. Ticket Location */}
        <LocationCard location={location} />

        {/* 5. Evidence & Documents */}
        <EvidenceCard
          ticketId={ticket.id}
          evidence={userEvidence}
          onRefetch={refetch}
        />

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
            challengeLetterSheetRef.current?.snapToIndex(0)
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

        {/* 10. Activity Timeline */}
        <ActivityTimelineCard events={timelineEvents} />
      </ScrollView>
    </SafeAreaView>

      {/* Sticky Bottom CTA - Pay & Challenge (outside SafeAreaView so it handles its own bottom inset) */}
      {!isTerminal && (
        <StickyBottomCTA
          currentAmount={currentAmount}
          onPay={handlePay}
          onChallenge={handleChallenge}
        />
      )}

      {/* Bottom Sheets */}
      <PremiumActionsBottomSheet
        visible={isPremiumActionsVisible}
        issuerType={ticketData.issuerType}
        onActionSelect={handlePremiumActionSelect}
        onClose={() => setIsPremiumActionsVisible(false)}
      />

      <ChallengeLetterBottomSheet
        ref={challengeLetterSheetRef}
        pcnNumber={ticketData.pcnNumber}
        issuerType={ticketData.issuerType}
        onSuccess={handleSuccess}
      />

      <FormsBottomSheet
        ref={formsSheetRef}
        pcnNumber={ticketData.pcnNumber}
        formType={selectedFormType || 'TE7'}
        onSuccess={handleSuccess}
      />
    </View>
  );
}
