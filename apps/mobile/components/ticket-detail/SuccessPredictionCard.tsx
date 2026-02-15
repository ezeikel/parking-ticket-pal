import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUnlock } from '@fortawesome/pro-solid-svg-icons';
import { Ticket } from '@/types';
import { getDisplayAmount } from '@/constants/ticket-status';
import ScoreGauge from '@/components/ScoreGauge/ScoreGauge';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type SuccessPredictionCardProps = {
  ticket: Ticket;
  isPremium: boolean;
};

export default function SuccessPredictionCard({
  ticket,
  isPremium,
}: SuccessPredictionCardProps) {
  const hasPrediction = !!ticket.prediction;
  const score = ticket.prediction?.percentage ?? 0;
  const numberOfCases = ticket.prediction?.numberOfCases ?? 0;
  const potentialSavings = getDisplayAmount(ticket);
  const locked = !isPremium || !hasPrediction;

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <Text className="font-jakarta-semibold text-lg text-dark mb-4">
        Success Prediction
      </Text>

      {/* Gauge */}
      <View className="items-center mb-4">
        <ScoreGauge
          score={locked ? 0 : score}
          size="lg"
          showLabel
          locked={locked}
          potentialSavings={potentialSavings}
          showSavings={!locked}
        />
      </View>

      {/* Explanation text */}
      {!locked && hasPrediction ? (
        <Text className="font-jakarta text-sm text-gray text-center">
          Based on {numberOfCases} similar cases with {ticket.issuer}
          {ticket.contraventionCode
            ? ` for Code ${ticket.contraventionCode}`
            : ''}
        </Text>
      ) : (
        <View className="items-center">
          <Text className="font-jakarta text-sm text-gray text-center mb-3">
            See your chances of successfully challenging this ticket
          </Text>
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
            <View className="bg-teal rounded-full px-5 py-2.5 flex-row items-center">
              <FontAwesomeIcon
                icon={faUnlock}
                size={12}
                color="#ffffff"
                style={{ marginRight: 6 }}
              />
              <Text className="font-jakarta-semibold text-sm text-white">
                Upgrade to See Score
              </Text>
            </View>
          </SquishyPressable>
        </View>
      )}
    </View>
  );
}
