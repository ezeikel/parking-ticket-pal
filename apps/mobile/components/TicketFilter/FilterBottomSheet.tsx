import React, { forwardRef, useMemo } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/pro-solid-svg-icons';
import {
  STATUS_CATEGORIES,
  type StatusCategory,
} from '../../hooks/useTicketFilters';
import SquishyPressable from '../SquishyPressable/SquishyPressable';

interface FilterBottomSheetProps {
  statusCategory: StatusCategory;
  onStatusCategoryChange: (category: StatusCategory) => void;
  onChange?: (index: number) => void;
}

const FilterBottomSheet = forwardRef<BottomSheet, FilterBottomSheetProps>(
  ({ statusCategory, onStatusCategoryChange, onChange }, ref) => {
    const snapPoints = useMemo(() => ['45%'], []);

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    const handleSelect = (category: StatusCategory) => {
      onStatusCategoryChange(category);
      // @ts-ignore
      ref?.current?.close();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={onChange}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db' }}
        handleStyle={{ paddingTop: 12 }}
      >
        <BottomSheetView className="flex-1 px-4">
          {/* Header */}
          <View className="mb-4 pt-2">
            <Text className="text-xl font-jakarta-bold text-dark">Filter Tickets</Text>
            <Text className="text-sm font-jakarta text-gray mt-1">
              Filter by status category
            </Text>
          </View>

          {/* Status category options */}
          <View className="gap-2">
            {STATUS_CATEGORIES.map((option) => {
              const isSelected = statusCategory === option.value;
              return (
                <SquishyPressable
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                >
                  <View
                    className="flex-row items-center justify-between p-4 rounded-xl border"
                    style={{
                      backgroundColor: isSelected ? 'rgba(26, 188, 156, 0.1)' : '#ffffff',
                      borderColor: isSelected ? '#222222' : '#E2E8F0',
                    }}
                  >
                    <Text
                      className={`text-base ${isSelected ? 'font-jakarta-semibold' : 'font-jakarta-medium'}`}
                      style={{ color: isSelected ? '#222222' : '#374151' }}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <FontAwesomeIcon icon={faCheck} size={18} color="#1abc9c" />
                    )}
                  </View>
                </SquishyPressable>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

FilterBottomSheet.displayName = 'FilterBottomSheet';

export default FilterBottomSheet;
