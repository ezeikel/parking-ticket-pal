import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircle, faCircleCheck } from '@fortawesome/pro-solid-svg-icons';
import { TicketStatus, IssuerType } from '@/types';

type TicketJourneyCardProps = {
  currentStatus: TicketStatus;
  issuerType: IssuerType;
};

type Stage = {
  status: TicketStatus;
  label: string;
};

const COUNCIL_STAGES: Stage[] = [
  { status: TicketStatus.ISSUED_DISCOUNT_PERIOD, label: 'Issued (Discount)' },
  { status: TicketStatus.ISSUED_FULL_CHARGE, label: 'Full Charge' },
  { status: TicketStatus.NOTICE_TO_OWNER, label: 'Notice to Owner' },
  { status: TicketStatus.FORMAL_REPRESENTATION, label: 'Formal Representation' },
  { status: TicketStatus.NOTICE_OF_REJECTION, label: 'Notice of Rejection' },
  { status: TicketStatus.APPEAL_TO_TRIBUNAL, label: 'Appeal to Tribunal' },
  { status: TicketStatus.CHARGE_CERTIFICATE, label: 'Charge Certificate' },
  { status: TicketStatus.ORDER_FOR_RECOVERY, label: 'Order for Recovery' },
  { status: TicketStatus.ENFORCEMENT_BAILIFF_STAGE, label: 'Enforcement' },
];

const PRIVATE_STAGES: Stage[] = [
  { status: TicketStatus.ISSUED_DISCOUNT_PERIOD, label: 'Issued (Discount)' },
  { status: TicketStatus.ISSUED_FULL_CHARGE, label: 'Full Charge' },
  { status: TicketStatus.NOTICE_TO_KEEPER, label: 'Notice to Keeper' },
  { status: TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR, label: 'Appeal Submitted' },
  { status: TicketStatus.APPEAL_REJECTED_BY_OPERATOR, label: 'Appeal Rejected' },
  { status: TicketStatus.POPLA, label: 'POPLA / IAS' },
  { status: TicketStatus.DEBT_COLLECTION, label: 'Debt Collection' },
];

const WON_STATUSES = new Set([
  TicketStatus.REPRESENTATION_ACCEPTED,
  TicketStatus.APPEAL_UPHELD,
  TicketStatus.APPEAL_SUCCESSFUL,
]);

const PAID_STATUSES = new Set([TicketStatus.PAID]);

export default function TicketJourneyCard({
  currentStatus,
  issuerType,
}: TicketJourneyCardProps) {
  const stages = issuerType === IssuerType.PRIVATE_COMPANY ? PRIVATE_STAGES : COUNCIL_STAGES;

  // Find current stage index
  const currentIndex = stages.findIndex((s) => s.status === currentStatus);
  const isWon = WON_STATUSES.has(currentStatus);
  const isPaid = PAID_STATUSES.has(currentStatus);

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <Text className="font-jakarta-semibold text-lg text-dark mb-2">
        Ticket Journey
      </Text>
      <Text className="font-jakarta text-sm text-gray mb-4">
        Track where you are in the PCN process.
      </Text>

      {/* Won / Paid banner */}
      {(isWon || isPaid) && (
        <View
          className="rounded-xl p-3 mb-4 flex-row items-center"
          style={{
            backgroundColor: isWon ? '#DCFCE7' : '#F3F4F6',
          }}
        >
          <FontAwesomeIcon
            icon={faCircleCheck}
            size={16}
            color={isWon ? '#16A34A' : '#6B7280'}
            style={{ marginRight: 8 }}
          />
          <Text
            className="font-jakarta-semibold text-sm"
            style={{ color: isWon ? '#16A34A' : '#6B7280' }}
          >
            {isWon ? 'Challenge Won!' : 'Ticket Paid'}
          </Text>
        </View>
      )}

      {/* Timeline */}
      <View style={{ paddingLeft: 12 }}>
        {stages.map((stage, index) => {
          const isPast = currentIndex >= 0 && index <= currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === stages.length - 1;

          return (
            <View key={stage.status} className="flex-row">
              {/* Timeline dot + line */}
              <View className="items-center mr-3" style={{ width: 16 }}>
                <FontAwesomeIcon
                  icon={isPast ? faCircleCheck : faCircle}
                  size={isPast ? 16 : 10}
                  color={
                    isCurrent
                      ? '#1abc9c'
                      : isPast
                        ? '#00A699'
                        : '#E2E8F0'
                  }
                />
                {!isLast && (
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 24,
                      backgroundColor: isPast && index < currentIndex ? '#00A699' : '#E2E8F0',
                    }}
                  />
                )}
              </View>

              {/* Stage label */}
              <View style={{ paddingBottom: isLast ? 0 : 12, flex: 1 }}>
                <Text
                  className={`font-jakarta${isCurrent ? '-semibold' : ''} text-sm`}
                  style={{
                    color: isCurrent ? '#222222' : isPast ? '#717171' : '#CBD5E1',
                  }}
                >
                  {stage.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
