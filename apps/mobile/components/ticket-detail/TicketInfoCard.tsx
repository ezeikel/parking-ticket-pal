import { View, Text } from 'react-native';
import { format, addDays } from 'date-fns';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPen } from '@fortawesome/pro-solid-svg-icons';
import { Ticket } from '@/types';
import { Address } from '@parking-ticket-pal/types';
import { getDisplayAmount, formatCurrency } from '@/constants/ticket-status';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type TicketInfoCardProps = {
  ticket: Ticket;
};

type InfoRowProps = {
  label: string;
  value: string;
  fullWidth?: boolean;
  valueColor?: string;
  note?: string;
  isVrm?: boolean;
};

const InfoRow = ({ label, value, fullWidth, valueColor, note, isVrm }: InfoRowProps) => (
  <View style={{ width: fullWidth ? '100%' : '50%', marginBottom: 16 }}>
    <Text className="font-jakarta text-xs text-gray mb-1">{label}</Text>
    {isVrm ? (
      <View className="bg-yellow rounded px-2 py-0.5 self-start">
        <Text className="font-uknumberplate text-sm text-dark">{value}</Text>
      </View>
    ) : (
      <Text
        className="font-jakarta-semibold text-sm"
        style={{ color: valueColor || '#222222' }}
        numberOfLines={2}
      >
        {value}
        {note ? (
          <Text className="font-jakarta text-xs text-gray"> {note}</Text>
        ) : null}
      </Text>
    )}
  </View>
);

export default function TicketInfoCard({ ticket }: TicketInfoCardProps) {
  const location = ticket.location as Address | null;
  const vehicleReg =
    ticket.vehicle?.registrationNumber || ticket.vehicle?.vrm || 'N/A';

  const issuedDate = format(new Date(ticket.issuedAt), 'dd MMM yyyy');
  const displayAmount = getDisplayAmount(ticket);
  const initialAmount = ticket.initialAmount ?? ticket.amountDue ?? 0;
  const formattedDisplayAmount = formatCurrency(displayAmount);
  const formattedInitialAmount = formatCurrency(initialAmount);

  const discountDeadline = format(addDays(new Date(ticket.issuedAt), 14), 'dd MMM yyyy');
  const finalDeadline = format(addDays(new Date(ticket.issuedAt), 28), 'dd MMM yyyy');

  const isDiscounted = displayAmount < initialAmount;

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      {/* Title + Edit */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="font-jakarta-semibold text-lg text-dark">
          Ticket Details
        </Text>
        <SquishyPressable onPress={() => router.push(`/ticket/${ticket.id}/edit` as any)}>
          <View className="flex-row items-center">
            <FontAwesomeIcon icon={faPen} size={14} color="#717171" />
            <Text className="font-jakarta-medium text-sm text-gray ml-1.5">
              Edit
            </Text>
          </View>
        </SquishyPressable>
      </View>

      {/* 2-column grid */}
      <View className="flex-row flex-wrap">
        <InfoRow label="PCN Reference" value={ticket.pcnNumber} />
        <InfoRow label="Issue Date" value={issuedDate} />

        {ticket.contraventionCode && (
          <InfoRow
            label="Contravention"
            value={ticket.contraventionCode}
            fullWidth
          />
        )}

        {location && (
          <InfoRow
            label="Location"
            value={
              [location.line1, location.city, location.postcode]
                .filter(Boolean)
                .join(', ') || 'Unknown'
            }
            fullWidth
          />
        )}

        <InfoRow label="Vehicle" value={vehicleReg} isVrm />
        <InfoRow label="Issuer" value={ticket.issuer} />

        <InfoRow label="Original Amount" value={formattedInitialAmount} />
        <InfoRow
          label="Current Amount"
          value={formattedDisplayAmount}
          valueColor={displayAmount > initialAmount ? '#FF5A5F' : undefined}
          note={isDiscounted ? '(50% discount)' : undefined}
        />

        <InfoRow label="Discount Deadline" value={discountDeadline} />
        <InfoRow label="Final Deadline" value={finalDeadline} />
      </View>
    </View>
  );
}
