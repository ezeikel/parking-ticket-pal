import React, { forwardRef, useMemo } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFileLines, faFileContract } from '@fortawesome/pro-regular-svg-icons';
import { IssuerType } from '@parking-ticket-pal/types';
import { getAvailableForms, FORM_TYPES, FormType } from '@/constants/challenges';
import SquishyPressable from './SquishyPressable/SquishyPressable';

type PremiumAction = 'challenge-letter' | FormType;

interface PremiumActionsBottomSheetProps {
  issuerType: IssuerType;
  onActionSelect: (action: PremiumAction) => void;
  onChange?: (index: number) => void;
}

const PremiumActionsBottomSheet = forwardRef<BottomSheet, PremiumActionsBottomSheetProps>(
  ({ issuerType, onActionSelect, onChange }, ref) => {
    const snapPoints = useMemo(() => ['50%', '75%'], []);
    const availableForms = useMemo(() => getAvailableForms(issuerType), [issuerType]);

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={onChange}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 16 }}>
          <Text className="text-xl font-bold text-gray-900 mb-4">Premium Actions</Text>
          <Text className="text-sm text-gray-600 mb-6">
            Generate professional documents to challenge your parking ticket
          </Text>

          {/* Challenge Letter */}
          <SquishyPressable
            onPress={() => onActionSelect('challenge-letter')}
            className="mb-3 active:opacity-70"
          >
            <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center">
              <View className="w-12 h-12 bg-blue-50 rounded-lg items-center justify-center mr-3">
                <FontAwesomeIcon icon={faFileLines} size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
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
              <Text className="text-xs font-semibold text-gray-500 mt-4 mb-2 uppercase">
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
                    <Text className="text-base font-semibold text-gray-900 mb-1">
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
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

PremiumActionsBottomSheet.displayName = 'PremiumActionsBottomSheet';

export default PremiumActionsBottomSheet;
