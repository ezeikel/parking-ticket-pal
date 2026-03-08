import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFileLines, faXmark, faRobot } from '@fortawesome/pro-regular-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SquishyPressable from './SquishyPressable/SquishyPressable';

export type PremiumAction = 'auto-challenge' | 'challenge-letter';

interface PremiumActionsBottomSheetProps {
  visible: boolean;
  onActionSelect: (action: PremiumAction) => void;
  onClose: () => void;
}

const PremiumActionsBottomSheet = ({
  visible,
  onActionSelect,
  onClose,
}: PremiumActionsBottomSheetProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      presentationStyle="formSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 + insets.top }}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-jakarta-bold text-gray-900">Premium Actions</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
          </Pressable>
        </View>
        <Text className="text-sm text-gray-600 mb-6">
          Challenge your parking ticket automatically or generate professional documents
        </Text>

        {/* Auto-Submit Challenge */}
        <SquishyPressable
          onPress={() => onActionSelect('auto-challenge')}
          className="mb-3 active:opacity-70"
          testID="action-auto-challenge"
        >
          <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center">
            <View className="w-12 h-12 bg-teal/10 rounded-lg items-center justify-center mr-3">
              <FontAwesomeIcon icon={faRobot} size={20} color="#14b8a6" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-base font-jakarta-semibold text-gray-900">
                  Auto-Submit Challenge
                </Text>
                <View className="bg-teal/10 rounded-full px-2 py-0.5">
                  <Text className="text-xs font-jakarta-medium text-teal">
                    Recommended
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-gray-600">
                We submit the challenge on the issuer's website for you
              </Text>
            </View>
          </View>
        </SquishyPressable>

        {/* Challenge Letter */}
        <SquishyPressable
          onPress={() => onActionSelect('challenge-letter')}
          className="mb-3 active:opacity-70"
          testID="action-challenge-letter"
        >
          <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center">
            <View className="w-12 h-12 bg-orange-50 rounded-lg items-center justify-center mr-3">
              <FontAwesomeIcon icon={faFileLines} size={20} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-jakarta-semibold text-gray-900 mb-1">
                Challenge Letter
              </Text>
              <Text className="text-sm text-gray-600">
                Generate a formal appeal letter to send by email or post
              </Text>
            </View>
          </View>
        </SquishyPressable>

      </View>
    </Modal>
  );
};

PremiumActionsBottomSheet.displayName = 'PremiumActionsBottomSheet';

export default PremiumActionsBottomSheet;
