import { View, Text, SectionListData } from 'react-native';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetSectionList,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCheck,
  faXmark,
  faRoad,
  faSquareParking,
  faCar,
  faMagnifyingGlass,
} from '@fortawesome/pro-solid-svg-icons';
import {
  CONTRAVENTION_CODES,
  type CodeCategory,
} from '@parking-ticket-pal/constants';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type CodeItem = {
  code: string;
  description: string;
  penaltyLevel: string;
};

type Section = {
  title: string;
  icon: typeof faRoad;
  data: CodeItem[];
};

type ContraventionCodePickerProps = {
  value: string;
  onSelect: (code: string) => void;
};

const CATEGORY_CONFIG: Record<
  CodeCategory,
  { label: string; icon: typeof faRoad }
> = {
  'on-street': { label: 'On-Street', icon: faRoad },
  'off-street': { label: 'Off-Street', icon: faSquareParking },
  'moving-traffic': { label: 'Moving Traffic', icon: faCar },
};

const CATEGORY_ORDER: CodeCategory[] = [
  'on-street',
  'off-street',
  'moving-traffic',
];

const ContraventionCodePicker = forwardRef<
  BottomSheet,
  ContraventionCodePickerProps
>(({ value, onSelect }, ref) => {
  const [search, setSearch] = useState('');

  const allCodes = useMemo(() => {
    return Object.entries(CONTRAVENTION_CODES).map(([code, data]) => ({
      code,
      description: data.description,
      penaltyLevel: data.penaltyLevel,
      category: data.category,
    }));
  }, []);

  const sections = useMemo(() => {
    const query = search.toLowerCase().trim();
    const filtered = query
      ? allCodes.filter(
          (c) =>
            c.code.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query),
        )
      : allCodes;

    const grouped: Record<CodeCategory, CodeItem[]> = {
      'on-street': [],
      'off-street': [],
      'moving-traffic': [],
    };

    for (const item of filtered) {
      grouped[item.category].push({
        code: item.code,
        description: item.description,
        penaltyLevel: item.penaltyLevel,
      });
    }

    // Sort each group numerically
    for (const cat of CATEGORY_ORDER) {
      grouped[cat].sort((a, b) => parseInt(a.code) - parseInt(b.code));
    }

    return CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map(
      (cat) => ({
        title: CATEGORY_CONFIG[cat].label,
        icon: CATEGORY_CONFIG[cat].icon,
        data: grouped[cat],
      }),
    );
  }, [search, allCodes]);

  const totalResults = sections.reduce((sum, s) => sum + s.data.length, 0);

  const handleSelect = useCallback(
    (code: string) => {
      onSelect(code);
      setSearch('');
      if (ref && 'current' in ref) {
        ref.current?.close();
      }
    },
    [onSelect, ref],
  );

  const handleClear = useCallback(() => {
    onSelect('');
    setSearch('');
    if (ref && 'current' in ref) {
      ref.current?.close();
    }
  }, [onSelect, ref]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<CodeItem, Section> }) => (
      <View
        className="flex-row items-center gap-x-2 px-4 py-2.5"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <FontAwesomeIcon
          icon={section.icon}
          size={14}
          color="#6B7280"
        />
        <Text className="font-jakarta-semibold text-xs text-gray-500 uppercase tracking-wider">
          {section.title}
        </Text>
        <View className="bg-gray-200 rounded-full px-2 py-0.5">
          <Text className="font-jakarta-medium text-xs text-gray-500">
            {section.data.length}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: CodeItem }) => {
      const isSelected = value === item.code;
      return (
        <SquishyPressable onPress={() => handleSelect(item.code)}>
          <View
            className="flex-row items-center px-4 py-3 mx-3 my-0.5 rounded-xl"
            style={{
              backgroundColor: isSelected
                ? 'rgba(26, 188, 156, 0.1)'
                : 'transparent',
            }}
          >
            {/* Code badge */}
            <View
              className="rounded-lg items-center justify-center mr-3"
              style={{
                backgroundColor: isSelected ? '#1ABC9C' : '#F1F5F9',
                width: 44,
                height: 36,
              }}
            >
              <Text
                className="font-jakarta-bold text-sm"
                style={{ color: isSelected ? '#fff' : '#374151' }}
              >
                {item.code}
              </Text>
            </View>

            {/* Description */}
            <Text
              className="font-jakarta text-sm flex-1 mr-2"
              style={{ color: isSelected ? '#111827' : '#4B5563' }}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            {/* Penalty indicator + check */}
            <View className="items-end gap-y-1">
              {isSelected && (
                <FontAwesomeIcon icon={faCheck} size={16} color="#1ABC9C" />
              )}
              <View
                className="rounded-full px-1.5 py-0.5"
                style={{
                  backgroundColor:
                    item.penaltyLevel === 'higher' ? '#FEE2E2' : '#DBEAFE',
                }}
              >
                <Text
                  className="font-jakarta-medium"
                  style={{
                    fontSize: 9,
                    color:
                      item.penaltyLevel === 'higher' ? '#DC2626' : '#2563EB',
                  }}
                >
                  {item.penaltyLevel === 'higher' ? 'Higher' : 'Lower'}
                </Text>
              </View>
            </View>
          </View>
        </SquishyPressable>
      );
    },
    [value, handleSelect],
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['70%', '92%']}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#d1d5db' }}
      handleStyle={{ paddingTop: 12 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={(index) => {
        if (index === -1) setSearch('');
      }}
    >
      {/* Header */}
      <View className="px-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-jakarta-semibold text-lg text-dark">
            Contravention Code
          </Text>
          {value ? (
            <SquishyPressable onPress={handleClear}>
              <View className="flex-row items-center gap-x-1.5 bg-gray-100 rounded-full px-3 py-1.5">
                <Text className="font-jakarta-medium text-xs text-gray-500">
                  Clear
                </Text>
                <FontAwesomeIcon icon={faXmark} size={12} color="#6B7280" />
              </View>
            </SquishyPressable>
          ) : null}
        </View>

        {/* Search input */}
        <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-3">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            size={16}
            color="#9CA3AF"
          />
          <BottomSheetTextInput
            className="flex-1 py-3 ml-2.5 text-base font-jakarta"
            placeholder="Search by code or description..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <SquishyPressable onPress={() => setSearch('')}>
              <FontAwesomeIcon icon={faXmark} size={16} color="#9CA3AF" />
            </SquishyPressable>
          )}
        </View>

        {/* Results count when searching */}
        {search.length > 0 && (
          <Text className="font-jakarta text-xs text-gray-400 mt-2">
            {totalResults} {totalResults === 1 ? 'code' : 'codes'} found
          </Text>
        )}
      </View>

      {/* Code list */}
      <BottomSheetSectionList
        sections={sections}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View className="items-center py-12 px-6">
            <Text className="font-jakarta-medium text-base text-gray-400 mb-1">
              No codes found
            </Text>
            <Text className="font-jakarta text-sm text-gray-300 text-center">
              Try a different search term
            </Text>
          </View>
        }
      />
    </BottomSheet>
  );
});

ContraventionCodePicker.displayName = 'ContraventionCodePicker';

export default ContraventionCodePicker;
