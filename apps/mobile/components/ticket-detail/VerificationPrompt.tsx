import { useState } from 'react';
import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShieldExclamation, faSpinnerThird } from '@fortawesome/pro-solid-svg-icons';
import { verifyTicket } from '@/api';
import { toast } from '@/lib/toast';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type VerificationPromptProps = {
  ticketId: string;
  pcnNumber: string;
  onVerified: () => void;
};

export default function VerificationPrompt({
  ticketId,
  pcnNumber,
  onVerified,
}: VerificationPromptProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyTicket(pcnNumber, ticketId);
      if (result.valid) {
        toast.success('Ticket verified successfully');
        onVerified();
      } else {
        toast.error(
          'Verification failed',
          'The issuer portal may be unavailable.',
        );
      }
    } catch {
      toast.error('Something went wrong', 'Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View
      className="rounded-2xl p-4 mb-4 flex-row items-center justify-between"
      style={{
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
      }}
    >
      <View className="flex-row items-center gap-2 flex-1 mr-3">
        <FontAwesomeIcon
          icon={faShieldExclamation}
          size={16}
          color="#D97706"
        />
        <Text className="font-jakarta text-sm" style={{ color: '#92400E' }}>
          This ticket hasn't been verified yet
        </Text>
      </View>
      <SquishyPressable onPress={handleVerify} disabled={isVerifying}>
        <View
          className="rounded-lg px-3 py-2"
          style={{ borderWidth: 1, borderColor: '#D1D5DB' }}
        >
          {isVerifying ? (
            <View className="flex-row items-center gap-1.5">
              <FontAwesomeIcon icon={faSpinnerThird} size={12} color="#6B7280" />
              <Text className="font-jakarta-medium text-xs text-gray">
                Verifying...
              </Text>
            </View>
          ) : (
            <Text className="font-jakarta-medium text-xs text-dark">
              Verify Now
            </Text>
          )}
        </View>
      </SquishyPressable>
    </View>
  );
}
