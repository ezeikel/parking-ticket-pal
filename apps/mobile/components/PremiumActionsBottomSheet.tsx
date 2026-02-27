import React, { useMemo } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFileLines, faFileContract, faXmark } from '@fortawesome/pro-regular-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IssuerType } from '@/types';
import { getAvailableForms, FORM_TYPES, FormType } from '@/constants/challenges';
import SquishyPressable from './SquishyPressable/SquishyPressable';

type PremiumAction = 'challenge-letter' | FormType;

interface PremiumActionsBottomSheetProps {
  visible: boolean;
  issuerType: IssuerType;
  onActionSelect: (action: PremiumAction) => void;
  onClose: () => void;
}

const PremiumActionsBottomSheet = ({
  visible,
  issuerType,
  onActionSelect,
  onClose,
}: PremiumActionsBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const availableForms = useMemo(() => getAvailableForms(issuerType), [issuerType]);

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
          Generate professional documents to challenge your parking ticket
        </Text>

        {/* Challenge Letter */}
        <SquishyPressable
          onPress={() => onActionSelect('challenge-letter')}
          className="mb-3 active:opacity-70"
        >
          <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center">
            <View className="w-12 h-12 bg-teal/10 rounded-lg items-center justify-center mr-3">
              <FontAwesomeIcon icon={faFileLines} size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-jakarta-semibold text-gray-900 mb-1">
                Challenge Letter
              </Text>
              <Text className="text-sm text-gray-600">
                Generate a formal appeal letter
              </Text>
            </View>
          </View>
        </SquishyPressable>

        {/* Divider */}
        {availableForms.length > 0 && (
          <View className="my-4">
            <View className="border-b border-gray-200" />
            <Text className="text-xs font-jakarta-semibold text-gray-500 mt-4 mb-2 uppercase">
              Official Forms
            </Text>
          </View>
        )}

        {/* Forms */}
        {availableForms.map((formType) => {
          const formInfo = FORM_TYPES[formType];
          return (
            <SquishyPressable
              key={formType}
              onPress={() => onActionSelect(formType)}
              className="mb-3 active:opacity-70"
            >
              <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center">
                <View className="w-12 h-12 bg-purple-50 rounded-lg items-center justify-center mr-3">
                  <FontAwesomeIcon icon={faFileContract} size={20} color="#9333ea" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-jakarta-semibold text-gray-900 mb-1">
                    {formInfo.name}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {formInfo.description}
                  </Text>
                </View>
              </View>
            </SquishyPressable>
          );
        })}
      </View>
    </Modal>
  );
};

PremiumActionsBottomSheet.displayName = 'PremiumActionsBottomSheet';

export default PremiumActionsBottomSheet;
