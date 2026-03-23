import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/pro-regular-svg-icons';
import { faLock, faCircleCheck } from '@fortawesome/pro-solid-svg-icons';
import ScoreGauge from '@/components/ScoreGauge/ScoreGauge';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

interface UpgradeNudgeSheetProps {
  visible: boolean;
  onUpgrade: () => void;
  onClose: () => void;
  daysUntilDiscount?: number | null;
}

const features = [
  'Success prediction score',
  'AI-drafted challenge letter',
  'Automatic submission',
  '30-day ad-free experience',
];

const UpgradeNudgeSheet = ({
  visible,
  onUpgrade,
  onClose,
  daysUntilDiscount,
}: UpgradeNudgeSheetProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      presentationStyle="formSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 16 + insets.top,
          paddingBottom: insets.bottom || 16,
          backgroundColor: '#ffffff',
        }}
      >
        {/* Close button */}
        <View className="flex-row justify-end mb-2">
          <Pressable onPress={onClose} hitSlop={12}>
            <FontAwesomeIcon icon={faXmark} size={20} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Header */}
        <Text className="text-2xl font-jakarta-bold text-dark text-center mb-2">
          Your ticket has been analysed
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          30,000+ cases analysed · 46% average win rate
        </Text>

        {/* Score gauge teaser (locked state) */}
        <View className="items-center mb-6">
          <ScoreGauge score={0} size="lg" showLabel locked />
          <Text className="text-xs text-gray-400 mt-2 font-jakarta-medium">
            See your chances
          </Text>
        </View>

        {/* Deadline urgency */}
        {daysUntilDiscount != null && daysUntilDiscount > 0 && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
            <Text className="text-sm text-amber-800 text-center font-jakarta-medium">
              Your discount deadline is in {daysUntilDiscount} day
              {daysUntilDiscount !== 1 ? 's' : ''}. Challenge before your fine
              doubles.
            </Text>
          </View>
        )}

        {/* Feature list — matching web checkmark style */}
        <View className="gap-2.5 mb-8">
          {features.map((label) => (
            <View key={label} className="flex-row items-center gap-2.5">
              <FontAwesomeIcon
                icon={faCircleCheck}
                size={16}
                color="#14b8a6"
              />
              <Text className="text-sm text-gray-700 font-jakarta-medium flex-1">
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Spacer */}
        <View className="flex-1" />

        {/* CTA — dark button matching web */}
        <SquishyPressable
          onPress={onUpgrade}
          className="rounded-xl py-3.5 bg-dark mb-3"
        >
          <Text className="font-jakarta-semibold text-white text-center text-base">
            Upgrade — £14.99
          </Text>
        </SquishyPressable>

        {/* Dismiss */}
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-sm text-gray-400 text-center font-jakarta-medium py-2">
            Not now
          </Text>
        </Pressable>

        {/* Fine print */}
        <Text className="text-xs text-gray-300 text-center mt-1 mb-2">
          One-time purchase per ticket. No subscriptions.
        </Text>
      </View>
    </Modal>
  );
};

UpgradeNudgeSheet.displayName = 'UpgradeNudgeSheet';

export default UpgradeNudgeSheet;
