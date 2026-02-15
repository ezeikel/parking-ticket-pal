import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faLock,
  faPen,
  faCreditCard,
  faTrash,
  faClock,
  faRobot,
  faWandMagicSparkles,
  faChartLine,
} from '@fortawesome/pro-solid-svg-icons';
import { Ticket } from '@/types';
import { deleteTicket } from '@/api';
import {
  needsActionStatus,
  isTerminalStatus,
  getDeadlineDays,
} from '@/constants/ticket-status';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type ActionsCardProps = {
  ticket: Ticket;
  isPremium: boolean;
  onOpenPremiumActions: () => void;
  onOpenChallengeLetter: () => void;
  onRefetch: () => void;
};

export default function ActionsCard({
  ticket,
  isPremium,
  onOpenPremiumActions,
  onOpenChallengeLetter,
  onRefetch,
}: ActionsCardProps) {
  const queryClient = useQueryClient();
  const needsAction = needsActionStatus(ticket.status);
  const isTerminal = isTerminalStatus(ticket.status);
  const deadlineDays = getDeadlineDays(ticket.issuedAt);

  const handleDelete = () => {
    Alert.alert(
      'Delete Ticket',
      `Are you sure you want to delete ticket ${ticket.pcnNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTicket(ticket.id);
              queryClient.invalidateQueries({ queryKey: ['tickets'] });
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete ticket. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleMarkAsPaid = () => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this ticket as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Paid',
          onPress: () => {
            // TODO: implement mark as paid API call
            onRefetch();
          },
        },
      ],
    );
  };

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <Text className="font-jakarta-semibold text-lg text-dark mb-4">
        Actions
      </Text>

      {/* Deadline alert inline */}
      {!isTerminal && deadlineDays <= 14 && deadlineDays > 0 && (
        <View
          className="rounded-xl p-3 mb-4 flex-row items-center"
          style={{
            backgroundColor: deadlineDays <= 3 ? '#FFE4E6' : '#FEF3C7',
            borderWidth: 1,
            borderColor: deadlineDays <= 3 ? '#FECDD3' : '#FDE68A',
          }}
        >
          <FontAwesomeIcon
            icon={faClock}
            size={14}
            color={deadlineDays <= 3 ? '#E11D48' : '#D97706'}
            style={{ marginRight: 8 }}
          />
          <Text
            className="font-jakarta-medium text-sm flex-1"
            style={{ color: deadlineDays <= 3 ? '#E11D48' : '#D97706' }}
          >
            {deadlineDays} day{deadlineDays !== 1 ? 's' : ''} remaining to respond
          </Text>
        </View>
      )}

      {/* Primary CTAs */}
      {isPremium && needsAction ? (
        <View className="gap-3 mb-4">
          <SquishyPressable onPress={onOpenPremiumActions}>
            <View className="bg-teal rounded-xl p-3.5 flex-row items-center justify-center">
              <FontAwesomeIcon icon={faRobot} size={14} color="#ffffff" style={{ marginRight: 8 }} />
              <Text className="font-jakarta-semibold text-sm text-white">
                Auto-Submit Challenge
              </Text>
            </View>
          </SquishyPressable>
          <SquishyPressable onPress={onOpenChallengeLetter}>
            <View className="rounded-xl p-3.5 flex-row items-center justify-center border border-teal">
              <FontAwesomeIcon icon={faWandMagicSparkles} size={14} color="#1abc9c" style={{ marginRight: 8 }} />
              <Text className="font-jakarta-semibold text-sm text-teal">
                Generate Challenge Letter
              </Text>
            </View>
          </SquishyPressable>
        </View>
      ) : isPremium && !isTerminal ? (
        <View className="gap-3 mb-4">
          <SquishyPressable onPress={onOpenPremiumActions}>
            <View className="bg-teal rounded-xl p-3.5 flex-row items-center justify-center">
              <FontAwesomeIcon icon={faChartLine} size={14} color="#ffffff" style={{ marginRight: 8 }} />
              <Text className="font-jakarta-semibold text-sm text-white">
                Track Status
              </Text>
            </View>
          </SquishyPressable>
        </View>
      ) : !isPremium && !isTerminal ? (
        <View className="mb-4">
          <SquishyPressable
            onPress={() =>
              router.push({
                pathname: '/(authenticated)/paywall' as any,
                params: {
                  mode: 'ticket_upgrades',
                  ticketId: ticket.id,
                },
              })
            }
          >
            <View className="bg-teal rounded-xl p-3.5 flex-row items-center justify-center">
              <FontAwesomeIcon
                icon={faLock}
                size={14}
                color="#ffffff"
                style={{ marginRight: 8 }}
              />
              <Text className="font-jakarta-semibold text-sm text-white">
                Upgrade to Challenge Ticket
              </Text>
            </View>
          </SquishyPressable>
        </View>
      ) : null}

      {/* Secondary actions */}
      <View className="border-t border-border pt-4 gap-3">
        <SquishyPressable onPress={() => router.push(`/ticket/${ticket.id}/edit` as any)}>
          <View className="flex-row items-center py-1">
            <FontAwesomeIcon icon={faPen} size={16} color="#717171" style={{ marginRight: 10 }} />
            <Text className="font-jakarta-medium text-sm text-dark">
              Edit Ticket
            </Text>
          </View>
        </SquishyPressable>

        {!isTerminal && (
          <SquishyPressable onPress={handleMarkAsPaid}>
            <View className="flex-row items-center py-1">
              <FontAwesomeIcon icon={faCreditCard} size={16} color="#717171" style={{ marginRight: 10 }} />
              <Text className="font-jakarta-medium text-sm text-dark">
                Mark as Paid
              </Text>
            </View>
          </SquishyPressable>
        )}

        <SquishyPressable onPress={handleDelete}>
          <View className="flex-row items-center py-1">
            <FontAwesomeIcon icon={faTrash} size={16} color="#FF5A5F" style={{ marginRight: 10 }} />
            <Text className="font-jakarta-medium text-sm text-coral">
              Delete Ticket
            </Text>
          </View>
        </SquishyPressable>
      </View>
    </View>
  );
}
