import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/pro-regular-svg-icons';
import SquishyPressable from '../SquishyPressable/SquishyPressable';
import Loader from '../Loader/Loader';

interface SearchBottomSheetProps {
  value: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  onChange?: (index: number) => void;
  isLoading?: boolean;
}

const MIN_SEARCH_LENGTH = 2;

const SearchBottomSheet = forwardRef<BottomSheet, SearchBottomSheetProps>(
  ({ value, onSearchChange, onClear, onChange, isLoading }, ref) => {
    const snapPoints = useMemo(() => ['50%'], []);
    const [localValue, setLocalValue] = useState(value);

    // Debounce search input with minimum character requirement
    useEffect(() => {
      const timer = setTimeout(() => {
        // Only trigger search if minimum character requirement is met or if clearing
        if (localValue.length >= MIN_SEARCH_LENGTH || localValue.length === 0) {
          onSearchChange(localValue);
        }
      }, 300);

      return () => clearTimeout(timer);
    }, [localValue, onSearchChange]);

    // Update local value when prop changes
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    const handleClear = () => {
      setLocalValue('');
      onClear();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={onChange}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView className="flex-1 px-4">
          <Text className="text-xl font-jakarta-bold text-gray-900 mb-2">Search Tickets</Text>
          <Text className="text-sm text-gray-600 mb-6">
            Search by PCN number, issuer, location, or vehicle registration
          </Text>

          {/* Search Input */}
          <View className="relative mb-4">
            <View className="absolute left-3 top-3.5 z-10">
              <FontAwesomeIcon icon={faMagnifyingGlass} size={18} color="#9ca3af" />
            </View>
            <TextInput
              value={localValue}
              onChangeText={setLocalValue}
              placeholder="Enter search term..."
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-12 py-3 text-base text-gray-900"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search tickets"
              accessibilityHint="Search by PCN number, issuer, location, or vehicle registration"
              accessibilityRole="search"
            />
            {isLoading && localValue.length >= MIN_SEARCH_LENGTH && (
              <View className="absolute right-3 top-3.5 z-10">
                <Loader size={18} color="#3b82f6" />
              </View>
            )}
            {!isLoading && localValue.length > 0 && (
              <View className="absolute right-3 top-3 z-10">
                <SquishyPressable onPress={handleClear}>
                  <View className="size-6 bg-gray-300 rounded-full items-center justify-center">
                    <FontAwesomeIcon icon={faXmark} size={14} color="#ffffff" />
                  </View>
                </SquishyPressable>
              </View>
            )}
          </View>

          {/* Minimum character message */}
          {localValue.length > 0 && localValue.length < MIN_SEARCH_LENGTH && (
            <View className="mb-4">
              <Text className="text-xs text-amber-600">
                Enter at least {MIN_SEARCH_LENGTH} characters to search
              </Text>
            </View>
          )}

          {/* Search Tips */}
          <View className="bg-teal/10 rounded-lg p-3">
            <Text className="text-xs font-jakarta-semibold text-teal-dark mb-2">Search Tips:</Text>
            <Text className="text-xs text-teal-dark leading-5">
              • PCN numbers: e.g., "AB123456789"
              {'\n'}• Issuer names: e.g., "Westminster"
              {'\n'}• Locations: e.g., "Baker Street"
              {'\n'}• Vehicle registrations: e.g., "AB12 CDE"
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

SearchBottomSheet.displayName = 'SearchBottomSheet';

export default SearchBottomSheet;
