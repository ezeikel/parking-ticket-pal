import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClock } from '@fortawesome/pro-solid-svg-icons';

type DeadlineAlertCardProps = {
  daysRemaining: number;
};

export default function DeadlineAlertCard({ daysRemaining }: DeadlineAlertCardProps) {
  if (daysRemaining <= 0 || daysRemaining > 14) return null;

  const isCritical = daysRemaining <= 3;

  return (
    <View
      className="rounded-2xl p-4 mb-4"
      style={{
        backgroundColor: isCritical ? '#FFE4E6' : '#FEF3C7',
        borderWidth: 1,
        borderColor: isCritical ? '#FECDD3' : '#FDE68A',
      }}
    >
      <View className="flex-row items-center mb-2">
        <FontAwesomeIcon
          icon={faClock}
          size={16}
          color={isCritical ? '#E11D48' : '#D97706'}
          style={{ marginRight: 8 }}
        />
        <Text
          className="font-jakarta-bold text-base"
          style={{ color: isCritical ? '#E11D48' : '#D97706' }}
        >
          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
        </Text>
      </View>
      <Text
        className="font-jakarta text-sm"
        style={{ color: isCritical ? '#BE123C' : '#B45309' }}
      >
        {isCritical
          ? 'Act now to avoid losing your right to challenge this ticket at a reduced rate.'
          : 'You still have time to challenge this ticket before the deadline passes.'}
      </Text>
    </View>
  );
}
