import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCreditCard, faPaperPlane } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type StickyBottomCTAProps = {
  currentAmount: number;
  onPay: () => void;
  onChallenge: () => void;
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toFixed(2)}`;

export default function StickyBottomCTA({
  currentAmount,
  onPay,
  onChallenge,
}: StickyBottomCTAProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
        flexDirection: 'row',
        columnGap: 12,
      }}
    >
      {/* Pay button */}
      <View style={{ flex: 1 }}>
        <SquishyPressable onPress={onPay}>
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon icon={faCreditCard} size={16} color="#222222" style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: '#222222' }}>
              Pay {formatAmount(currentAmount)}
            </Text>
          </View>
        </SquishyPressable>
      </View>

      {/* Challenge button */}
      <View style={{ flex: 1 }}>
        <SquishyPressable onPress={onChallenge}>
          <View
            style={{
              borderRadius: 12,
              backgroundColor: '#1abc9c',
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon icon={faPaperPlane} size={14} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: '#ffffff' }}>
              Challenge
            </Text>
          </View>
        </SquishyPressable>
      </View>
    </View>
  );
}
