import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { TicketStatus } from '../../types';
import SquishyPressable from '../SquishyPressable/SquishyPressable';
import { ActionButton } from '../ActionButton';

interface FilterBottomSheetProps {
  availableIssuers: string[];
  availableStatuses: TicketStatus[];
  selectedIssuers: string[];
  selectedStatuses: TicketStatus[];
  onIssuersChange: (issuers: string[]) => void;
  onStatusesChange: (statuses: TicketStatus[]) => void;
  onApply: () => void;
  onChange?: (index: number) => void;
  onClear?: () => void;
}

const STATUS_LABELS: Partial<Record<TicketStatus, string>> = {
  [TicketStatus.ISSUED_DISCOUNT_PERIOD]: 'Early Payment',
  [TicketStatus.ISSUED_FULL_CHARGE]: 'Full Charge',
  [TicketStatus.NOTICE_TO_OWNER]: 'Notice to Owner',
  [TicketStatus.FORMAL_REPRESENTATION]: 'Formal Representation',
  [TicketStatus.NOTICE_OF_REJECTION]: 'Notice of Rejection',
  [TicketStatus.REPRESENTATION_ACCEPTED]: 'Accepted',
  [TicketStatus.CHARGE_CERTIFICATE]: 'Charge Certificate',
  [TicketStatus.ORDER_FOR_RECOVERY]: 'Order for Recovery',
  [TicketStatus.TEC_OUT_OF_TIME_APPLICATION]: 'TEC Application',
  [TicketStatus.PE2_PE3_APPLICATION]: 'PE2/PE3 Application',
  [TicketStatus.APPEAL_TO_TRIBUNAL]: 'Appeal to Tribunal',
  [TicketStatus.ENFORCEMENT_BAILIFF_STAGE]: 'Bailiff Stage',
  [TicketStatus.NOTICE_TO_KEEPER]: 'Notice to Keeper',
  [TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR]: 'Appeal Submitted',
  [TicketStatus.APPEAL_REJECTED_BY_OPERATOR]: 'Appeal Rejected',
  [TicketStatus.PAID]: 'Paid',
};

const FilterBottomSheet = forwardRef<BottomSheet, FilterBottomSheetProps>(
  ({
    availableIssuers,
    availableStatuses,
    selectedIssuers,
    selectedStatuses,
    onIssuersChange,
    onStatusesChange,
    onApply,
    onChange,
    onClear,
  }, ref) => {
    const snapPoints = useMemo(() => ['65%'], []);
    const [tempSelectedIssuers, setTempSelectedIssuers] = useState<string[]>(selectedIssuers);
    const [tempSelectedStatuses, setTempSelectedStatuses] = useState<TicketStatus[]>(selectedStatuses);

    // Update temp state when props change
    useEffect(() => {
      setTempSelectedIssuers(selectedIssuers);
      setTempSelectedStatuses(selectedStatuses);
    }, [selectedIssuers, selectedStatuses]);

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    const toggleIssuer = (issuer: string) => {
      const isSelected = tempSelectedIssuers.includes(issuer);
      if (isSelected) {
        setTempSelectedIssuers(tempSelectedIssuers.filter((i) => i !== issuer));
      } else {
        setTempSelectedIssuers([...tempSelectedIssuers, issuer]);
      }
    };

    const toggleStatus = (status: TicketStatus) => {
      const isSelected = tempSelectedStatuses.includes(status);
      if (isSelected) {
        setTempSelectedStatuses(tempSelectedStatuses.filter((s) => s !== status));
      } else {
        setTempSelectedStatuses([...tempSelectedStatuses, status]);
      }
    };

    const handleClearFilters = () => {
      setTempSelectedIssuers([]);
      setTempSelectedStatuses([]);
      onClear?.();
    };

    const handleApply = () => {
      onIssuersChange(tempSelectedIssuers);
      onStatusesChange(tempSelectedStatuses);
      onApply();
    };

    const totalActiveCount = tempSelectedIssuers.length + tempSelectedStatuses.length;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableOverDrag={false}
        overDragResistanceFactor={10}
        backdropComponent={renderBackdrop}
        onChange={onChange}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db' }}
        handleStyle={{ paddingTop: 12 }}
      >
        <BottomSheetView className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4 px-4 pt-2">
            <View>
              <Text className="text-xl font-bold text-gray-900">Filters</Text>
              {totalActiveCount > 0 && (
                <Text className="text-sm text-gray-600 mt-1">
                  {totalActiveCount} selected
                </Text>
              )}
            </View>
            {totalActiveCount > 0 && (
              <SquishyPressable onPress={handleClearFilters}>
                <Text className="text-sm font-semibold text-blue-600">Clear All</Text>
              </SquishyPressable>
            )}
          </View>

          {/* Scrollable Content */}
          <BottomSheetScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Issuer Filter */}
            {availableIssuers.length > 1 && (
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Issuer
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {availableIssuers.map((issuer) => {
                    const isSelected = tempSelectedIssuers.includes(issuer);
                    return (
                      <SquishyPressable
                        key={issuer}
                        onPress={() => toggleIssuer(issuer)}
                      >
                        <View
                          className={`px-4 py-2.5 rounded-full border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              isSelected ? 'text-white' : 'text-gray-700'
                            }`}
                          >
                            {issuer}
                          </Text>
                        </View>
                      </SquishyPressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Status Filter */}
            {availableStatuses.length > 0 && (
              <View>
                <Text className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Status
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {availableStatuses.map((status) => {
                    const isSelected = tempSelectedStatuses.includes(status);
                    const label = STATUS_LABELS[status] || status.replace(/_/g, ' ');
                    return (
                      <SquishyPressable
                        key={status}
                        onPress={() => toggleStatus(status)}
                      >
                        <View
                          className={`px-4 py-2.5 rounded-full border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              isSelected ? 'text-white' : 'text-gray-700'
                            }`}
                          >
                            {label}
                          </Text>
                        </View>
                      </SquishyPressable>
                    );
                  })}
                </View>
              </View>
            )}
          </BottomSheetScrollView>

          {/* Apply Button */}
          <View className="px-4 py-4 border-t border-gray-200 bg-white">
            <ActionButton onPress={handleApply} label="Apply Filters" variant="primary" />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

FilterBottomSheet.displayName = 'FilterBottomSheet';

export default FilterBottomSheet;
