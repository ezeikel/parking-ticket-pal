import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowUpWideShort, faArrowDownShortWide, faCheck } from '@fortawesome/pro-regular-svg-icons';
import type { TicketFilters } from '../../api';
import { SORT_OPTIONS } from '../../hooks/useTicketFilters';
import SquishyPressable from '../SquishyPressable/SquishyPressable';
import { ActionButton } from '../ActionButton';

interface SortBottomSheetProps {
  sortBy: TicketFilters['sortBy'];
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: TicketFilters['sortBy'], sortOrder: 'asc' | 'desc') => void;
  onChange?: (index: number) => void;
  onClear?: () => void;
}

const SortBottomSheet = forwardRef<BottomSheet, SortBottomSheetProps>(
  ({ sortBy, sortOrder, onSortChange, onChange, onClear }, ref) => {
    const snapPoints = useMemo(() => ['55%'], []);
    const [tempSortBy, setTempSortBy] = useState(sortBy);
    const [tempSortOrder, setTempSortOrder] = useState(sortOrder);

    // Update temp state when props change (i.e., when filters are applied)
    useEffect(() => {
      setTempSortBy(sortBy);
      setTempSortOrder(sortOrder);
    }, [sortBy, sortOrder]);

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    const handleApply = () => {
      onSortChange(tempSortBy, tempSortOrder);
      // @ts-ignore
      ref?.current?.close();
    };

    const handleClearSort = () => {
      setTempSortBy('issuedAt');
      setTempSortOrder('desc');
      onClear?.();
    };

    const toggleSortOrder = () => {
      setTempSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    // Check if APPLIED sort (from props) differs from default, not temp state
    const hasNonDefaultSort = sortBy !== 'issuedAt' || sortOrder !== 'desc';

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={onChange}
      >
        <BottomSheetView className="flex-1 px-4">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4 pt-2">
            <View>
              <Text className="text-xl font-bold text-gray-900">Sort Tickets</Text>
              <Text className="text-sm text-gray-600 mt-1">
                Choose how to order your tickets
              </Text>
            </View>
            {hasNonDefaultSort && (
              <SquishyPressable onPress={handleClearSort}>
                <Text className="text-sm font-semibold text-blue-600">Clear Sort</Text>
              </SquishyPressable>
            )}
          </View>

          {/* Sort Direction Toggle */}
          <View className="mb-4 flex-row items-center justify-between bg-gray-50 rounded-xl p-3">
            <Text className="text-sm font-medium text-gray-700">Sort Direction</Text>
            <SquishyPressable
              onPress={toggleSortOrder}
              className="flex-row items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200"
            >
              <FontAwesomeIcon
                icon={tempSortOrder === 'asc' ? faArrowUpWideShort : faArrowDownShortWide}
                size={16}
                color="#3b82f6"
              />
              <Text className="text-sm font-medium text-gray-900">
                {tempSortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Text>
            </SquishyPressable>
          </View>

          {/* Sort Options */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Sort By
            </Text>
            {SORT_OPTIONS.map((option) => {
              const isSelected = tempSortBy === option.value;
              return (
                <SquishyPressable
                  key={option.value}
                  onPress={() => setTempSortBy(option.value)}
                  className="mb-2"
                >
                  <View
                    className={`flex-row items-center justify-between p-4 rounded-xl border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-base font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <FontAwesomeIcon icon={faCheck} size={18} color="#2563eb" />
                    )}
                  </View>
                </SquishyPressable>
              );
            })}
          </View>

          {/* Apply Button */}
          <View className="mt-auto py-4 border-t border-gray-200 bg-white" style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            <ActionButton onPress={handleApply} label="Apply Sort" variant="primary" />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

SortBottomSheet.displayName = 'SortBottomSheet';

export default SortBottomSheet;
