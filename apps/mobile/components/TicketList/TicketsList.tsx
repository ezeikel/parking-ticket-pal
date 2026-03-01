import { useCallback, useMemo, memo } from 'react';
import { Text, View, RefreshControl, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faClock,
  faCarSide,
  faCalendar,
  faLocationDot,
  faLock,
  faSterlingSign,
  faTriangleExclamation,
  faCardsBlank,
  faCrown,
  faPlus,
} from '@fortawesome/pro-solid-svg-icons';
import { addDays, format } from 'date-fns';
import useTickets from '@/hooks/api/useTickets';
import useDraftTickets from '@/hooks/api/useDraftTickets';
import { Ticket, TicketStatus, DraftTicket } from '@/types';
import { type TicketFilters } from '@/api';
import { usePurchases } from '@/contexts/purchases';
import {
  getStatusConfig,
  isTerminalStatus,
  getIssuerInitials,
  getDeadlineDays,
  getDisplayAmount,
  formatCurrency,
} from '@/constants/ticket-status';
import Loader from '@/components/Loader/Loader';
import EmptyState from '@/components/EmptyState/EmptyState';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import ScoreGauge from '@/components/ScoreGauge/ScoreGauge';

interface TicketsListProps {
  filters?: TicketFilters;
}

const ticketItemStyle = { marginHorizontal: 16, marginBottom: 16 };

const TicketItem = memo(function TicketItem({
  ticket,
  style,
  hasSubscription,
}: {
  ticket: Ticket;
  style: Record<string, unknown>;
  hasSubscription: boolean;
}) {
  const statusConfig = getStatusConfig(ticket.status);
  const isTerminal = isTerminalStatus(ticket.status);
  const initials = getIssuerInitials(ticket.issuer);
  const deadlineDays = getDeadlineDays(ticket.issuedAt);
  const displayAmount = getDisplayAmount(ticket);
  const formattedAmount = formatCurrency(displayAmount);
  const formattedDate = format(new Date(ticket.issuedAt), 'MMM d, yyyy');

  const vehicleReg =
    ticket.vehicle?.registrationNumber || ticket.vehicle?.vrm || 'N/A';

  const tier = ticket.tier || 'FREE';
  const isPremium = tier === 'PREMIUM' || hasSubscription;
  const hasPrediction = !!ticket.prediction;
  const score = ticket.prediction?.percentage ?? 0;

  return (
    <SquishyPressable
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      style={style}
    >
      <View className="rounded-2xl border border-border bg-white">
        {/* Top row: avatar + PCN + status badge */}
        <View className="flex-row items-start justify-between p-4 pb-3">
          <View className="flex-row items-center flex-1">
            {/* Issuer avatar */}
            <View className="h-11 w-11 rounded-full bg-light items-center justify-center mr-3">
              <Text className="font-jakarta-bold text-sm text-dark">
                {initials}
              </Text>
            </View>
            <View className="flex-1">
              <Text
                className="font-jakarta-bold text-base text-dark"
                numberOfLines={1}
              >
                {ticket.pcnNumber}
              </Text>
              <Text
                className="font-jakarta text-sm text-gray"
                numberOfLines={1}
              >
                {ticket.issuer}
              </Text>
            </View>
          </View>
          {/* Status badge */}
          <View
            className="rounded-full px-3 py-1 ml-2"
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

        {/* Details grid 2x2 */}
        <View className="px-4 pb-3">
          <View className="flex-row flex-wrap gap-y-2.5">
            {/* Location */}
            <View className="flex-row items-center w-1/2">
              <FontAwesomeIcon
                icon={faLocationDot}
                size={13}
                color="#717171"
                style={{ marginRight: 6 }}
              />
              <Text
                className="font-jakarta text-sm text-gray flex-1"
                numberOfLines={1}
              >
                {ticket.location
                  ? (ticket.location as any)?.line1 || 'Unknown'
                  : 'No location'}
              </Text>
            </View>

            {/* Amount */}
            <View className="flex-row items-center w-1/2">
              <FontAwesomeIcon
                icon={faSterlingSign}
                size={13}
                color="#717171"
                style={{ marginRight: 6 }}
              />
              <Text className="font-jakarta-semibold text-sm text-dark">
                {formattedAmount}
              </Text>
            </View>

            {/* Vehicle reg */}
            <View className="flex-row items-center w-1/2">
              <FontAwesomeIcon
                icon={faCarSide}
                size={13}
                color="#717171"
                style={{ marginRight: 6 }}
              />
              <View className="bg-yellow rounded px-1.5 py-0.5">
                <Text className="font-uknumberplate text-xs text-dark">
                  {vehicleReg}
                </Text>
              </View>
            </View>

            {/* Date */}
            <View className="flex-row items-center w-1/2">
              <FontAwesomeIcon
                icon={faCalendar}
                size={13}
                color="#717171"
                style={{ marginRight: 6 }}
              />
              <Text className="font-jakarta text-sm text-gray">
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Deadline warning */}
        {!isTerminal && deadlineDays <= 14 && (
          <View className="px-4 pb-3">
            <View className="flex-row items-center">
              <FontAwesomeIcon
                icon={faClock}
                size={13}
                color={deadlineDays <= 0 ? '#FF5A5F' : '#D97706'}
                style={{ marginRight: 6 }}
              />
              <Text
                className="font-jakarta-medium text-sm"
                style={{ color: deadlineDays <= 0 ? '#FF5A5F' : '#D97706' }}
              >
                {deadlineDays <= 0
                  ? 'Overdue'
                  : `Due in ${deadlineDays} day${deadlineDays !== 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom row: score gauge + CTA */}
        {!isTerminal && (
          <View className="border-t border-border mx-4 pt-3 pb-4 flex-row items-center justify-between">
            {/* Score gauge section */}
            <View className="flex-row items-center">
              {hasPrediction && isPremium ? (
                <>
                  <ScoreGauge score={score} size="sm" />
                  <Text className="font-jakarta text-xs text-gray ml-2">
                    Success chance
                  </Text>
                </>
              ) : (
                <>
                  <ScoreGauge score={0} size="sm" locked />
                  <Text className="font-jakarta text-xs text-gray ml-2">
                    Unlock score
                  </Text>
                </>
              )}
            </View>

            {/* CTA button */}
            {isPremium ? (
              <View className="bg-teal rounded-full px-4 py-2">
                <Text className="font-jakarta-semibold text-xs text-white">
                  Challenge Now
                </Text>
              </View>
            ) : (
              <View className="bg-teal rounded-full px-3 py-2 flex-row items-center">
                <FontAwesomeIcon
                  icon={faLock}
                  size={10}
                  color="#ffffff"
                  style={{ marginRight: 4 }}
                />
                <Text className="font-jakarta-semibold text-xs text-white">
                  Upgrade to Challenge
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SquishyPressable>
  );
});

const DraftTicketItem = memo(function DraftTicketItem({
  draftTicket,
  style,
}: {
  draftTicket: DraftTicket;
  style: Record<string, unknown>;
}) {
  const formattedDate = format(new Date(draftTicket.createdAt), 'MMM d, yyyy');

  return (
    <SquishyPressable
      onPress={() =>
        router.push(`/complete-draft?draftTicketId=${draftTicket.id}`)
      }
      style={style}
    >
      <View
        className="rounded-2xl border border-teal bg-white"
        style={{ borderStyle: 'dashed' }}
      >
        <View className="flex-row items-start justify-between p-4 pb-3">
          <View className="flex-row items-center flex-1">
            {/* Crown icon for premium */}
            <View className="h-11 w-11 rounded-full bg-teal/10 items-center justify-center mr-3">
              <FontAwesomeIcon icon={faCrown} size={18} color="#14B8A6" />
            </View>
            <View className="flex-1">
              <Text className="font-jakarta-bold text-base text-dark">
                Premium Ticket
              </Text>
              <Text className="font-jakarta text-sm text-gray">
                Purchased {formattedDate}
              </Text>
            </View>
          </View>
          {/* Premium badge */}
          <View
            className="rounded-full px-3 py-1 ml-2"
            style={{ backgroundColor: '#CCFBF1' }}
          >
            <Text
              className="font-jakarta-medium text-xs"
              style={{ color: '#0D9488' }}
            >
              Premium
            </Text>
          </View>
        </View>

        {/* CTA */}
        <View className="border-t border-teal/20 mx-4 pt-3 pb-4 flex-row items-center justify-between">
          <Text className="font-jakarta text-sm text-gray">
            Add your details to get started
          </Text>
          <View className="bg-teal rounded-full px-4 py-2 flex-row items-center">
            <FontAwesomeIcon
              icon={faPlus}
              size={10}
              color="#ffffff"
              style={{ marginRight: 4 }}
            />
            <Text className="font-jakarta-semibold text-xs text-white">
              Add Details
            </Text>
          </View>
        </View>
      </View>
    </SquishyPressable>
  );
});

const TicketsList = ({ filters }: TicketsListProps) => {
  const {
    data: { tickets } = {},
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useTickets(filters);
  const { data: { draftTickets } = {}, refetch: refetchDrafts } = useDraftTickets();
  const { hasPremiumAccess } =
    usePurchases();

  const hasSubscription = hasPremiumAccess;
  const hasDrafts = draftTickets && draftTickets.length > 0;

  const onRefresh = useCallback(() => {
    refetch();
    refetchDrafts();
  }, [refetch, refetchDrafts]);

  const renderTicketItem = useCallback(({ item }: { item: Ticket }) => (
    <TicketItem
      ticket={item}
      hasSubscription={hasSubscription}
      style={ticketItemStyle}
    />
  ), [hasSubscription]);

  // Client-side sorting fallback — must be above early returns to satisfy Rules of Hooks
  const displayTickets = useMemo(() => {
    if (!tickets || !tickets.length) return tickets;
    if (filters?.sortBy) return tickets;
    return [...tickets].sort((a, b) => {
      const aDeadline = addDays(
        new Date(a.issuedAt),
        a.status === TicketStatus.ISSUED_DISCOUNT_PERIOD ? 14 : 28,
      );
      const bDeadline = addDays(
        new Date(b.issuedAt),
        b.status === TicketStatus.ISSUED_DISCOUNT_PERIOD ? 14 : 28,
      );
      return aDeadline.getTime() - bDeadline.getTime();
    });
  }, [tickets, filters?.sortBy]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loader />
      </View>
    );
  }

  if (isError) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 items-center justify-center"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        <EmptyState
          icon={faTriangleExclamation}
          title="Something went wrong"
          description="Pull down to refresh and try again"
        />
      </ScrollView>
    );
  }

  if (!tickets || !tickets.length) {
    const hasActiveFilters =
      filters?.search ||
      (filters?.status && filters.status.length > 0) ||
      (filters?.issuerType && filters.issuerType.length > 0) ||
      (filters?.ticketType && filters.ticketType.length > 0);

    // If we have draft tickets but no real tickets, show drafts with a scroll view
    if (hasDrafts) {
      return (
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
        >
          {draftTickets.map((draft) => (
            <DraftTicketItem
              key={draft.id}
              draftTicket={draft}
              style={ticketItemStyle}
            />
          ))}
        </ScrollView>
      );
    }

    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 items-center justify-center"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        <EmptyState
          icon={faCardsBlank}
          title={hasActiveFilters ? 'No tickets found' : 'No tickets yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your filters or search terms'
              : 'Use the camera button to capture your first parking ticket'
          }
        />
      </ScrollView>
    );
  }

  const hasSearch = !!filters?.search;
  const hasFilters =
    (filters?.status && filters.status.length > 0) ||
    (filters?.issuers && filters.issuers.length > 0) ||
    (filters?.issuerType && filters.issuerType.length > 0) ||
    (filters?.ticketType && filters.ticketType.length > 0);
  const showResultCount = hasSearch || hasFilters;

  return (
    <View className="flex-1">
      {showResultCount && (
        <View className="mb-3">
          <Text className="font-jakarta text-sm text-gray">
            Found {tickets.length}{' '}
            {tickets.length === 1 ? 'ticket' : 'tickets'}
            {hasSearch && ` matching "${filters.search}"`}
          </Text>
        </View>
      )}
      <FlashList
        data={displayTickets}
        renderItem={renderTicketItem}
        keyExtractor={(item) => item.id.toString()}
        getItemType={(item) => isTerminalStatus(item.status) ? 'terminal' : 'active'}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          hasDrafts ? (
            <View>
              {draftTickets.map((draft) => (
                <DraftTicketItem
                  key={draft.id}
                  draftTicket={draft}
                  style={ticketItemStyle}
                />
              ))}
            </View>
          ) : undefined
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

export default TicketsList;
