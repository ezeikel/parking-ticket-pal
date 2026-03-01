import { View, Text, useWindowDimensions, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faFilter, faArrowDownWideShort, faMap, faXmark, faCamera, faPlus } from '@fortawesome/pro-solid-svg-icons';
import TicketsList from '@/components/TicketList/TicketsList';
import { useAnalytics } from '@/lib/analytics';
import NotificationBell from '@/components/NotificationBell';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import SearchBottomSheet from '@/components/TicketSearch/SearchBottomSheet';
import FilterBottomSheet from '@/components/TicketFilter/FilterBottomSheet';
import SortBottomSheet from '@/components/TicketSort/SortBottomSheet';
import { useTicketFilters } from '@/hooks/useTicketFilters';
import useTickets from '@/hooks/api/useTickets';
import { AdBanner } from '@/components/AdBanner';
import TicketsMapView from '@/components/TicketsMapView/TicketsMapView';
import { FAB_SIZE, FAB_GAP, FAB_BOTTOM_OFFSET } from '@/constants/TabBar';
import { MAX_CONTENT_WIDTH } from '@/constants/layout';
import { useSheetContext } from '@/contexts/SheetContext';
import { perfect } from '@/styles';

const padding = 16;

const fabStyle = {
  width: FAB_SIZE,
  height: FAB_SIZE,
  borderRadius: FAB_SIZE / 2,
  backgroundColor: '#222222',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const TicketsScreen = () => {
  const { width } = useWindowDimensions();
  const screenWidth = width - padding * 2;
  const { trackEvent } = useAnalytics();
  const searchSheetRef = useRef<BottomSheet>(null);
  const filterSheetRef = useRef<BottomSheet>(null);
  const sortSheetRef = useRef<BottomSheet>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { openCamera, openManualEntry } = useSheetContext();

  const {
    filters,
    search,
    statusCategory,
    sortOption,
    updateSearch,
    updateStatusCategory,
    updateSort,
    clearAllFilters,
    clearSearch,
    activeFilterCount,
  } = useTicketFilters();

  // Get filtered tickets data to check loading state
  const { isFetching: isSearching, data: filteredTicketsData } = useTickets(filters);

  const handleOpenSearch = () => {
    trackEvent('search_opened', { source: 'tickets_list' });
    searchSheetRef.current?.expand();
  };

  const handleOpenFilter = () => {
    trackEvent('filter_opened', { source: 'tickets_list' });
    filterSheetRef.current?.expand();
  };

  const handleOpenSort = () => {
    trackEvent('sort_opened', { source: 'tickets_list' });
    sortSheetRef.current?.expand();
  };

  const handleSearchChange = (searchTerm: string) => {
    updateSearch(searchTerm);
  };

  // Track search results when data changes and search is active
  useEffect(() => {
    if (search && search.length >= 2 && filteredTicketsData) {
      const resultCount = (filteredTicketsData as any)?.tickets?.length || 0;
      trackEvent('search_performed', {
        searchTerm: search,
        searchLength: search.length,
        resultCount,
        hasResults: resultCount > 0,
      });
    }
  }, [filteredTicketsData, search]);

  const handleClearSearch = () => {
    trackEvent('search_cleared', {
      previousTerm: search,
      hadResults: (filteredTicketsData as any)?.tickets?.length > 0,
    });
    clearSearch();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-jakarta-bold text-dark">
            Tickets
          </Text>
          <View className="flex-row items-center gap-3">
            <NotificationBell />
          </View>
        </View>

        {/* Search, Filter, Sort Controls */}
        <View className="flex-row items-center gap-2">
          {/* Search Button */}
          <SquishyPressable
            onPress={handleOpenSearch}
            className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color="#6b7280" />
            <Text className="ml-2 text-sm text-gray-500 flex-1" numberOfLines={1}>
              {search || 'Search tickets...'}
            </Text>
          </SquishyPressable>

          {/* Filter Button */}
          <SquishyPressable
            onPress={handleOpenFilter}
            className="relative bg-gray-50 border border-gray-200 rounded-xl p-3"
          >
            <FontAwesomeIcon icon={faFilter} size={20} color="#6b7280" />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-dark rounded-full items-center justify-center">
                <Text className="text-white text-xs font-jakarta-bold">{activeFilterCount}</Text>
              </View>
            )}
          </SquishyPressable>

          {/* Sort Button */}
          <SquishyPressable
            onPress={handleOpenSort}
            className="bg-gray-50 border border-gray-200 rounded-xl p-3"
          >
            <FontAwesomeIcon icon={faArrowDownWideShort} size={20} color="#6b7280" />
          </SquishyPressable>
        </View>
      </View>

      {/* Banner Ad */}
      <AdBanner placement="tickets" />

      <View className="flex-1 bg-gray-50">
        <View
          className="flex-1"
          style={{
            marginTop: padding,
            width: screenWidth,
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: 'center',
          }}
        >
          <TicketsList filters={filters} />
        </View>
      </View>

      {/* Bottom Sheets */}
      <SearchBottomSheet
        ref={searchSheetRef}
        value={search}
        onSearchChange={handleSearchChange}
        onClear={handleClearSearch}
        isLoading={isSearching}
      />

      <FilterBottomSheet
        ref={filterSheetRef}
        statusCategory={statusCategory}
        onStatusCategoryChange={updateStatusCategory}
      />

      <SortBottomSheet
        ref={sortSheetRef}
        sortOption={sortOption}
        onSortChange={updateSort}
      />

      {/* FAB stack — camera (top), plus (middle), map (bottom) */}
      <View
        style={{
          position: 'absolute',
          bottom: FAB_BOTTOM_OFFSET,
          right: 16,
          zIndex: 10,
          gap: FAB_GAP,
          alignItems: 'center',
        }}
        pointerEvents="box-none"
      >
        <SquishyPressable
          testID="fab-camera"
          onPress={openCamera}
          style={[fabStyle, perfect.cardShadow]}
          accessibilityRole="button"
          accessibilityLabel="Scan parking ticket"
        >
          <FontAwesomeIcon icon={faCamera} size={20} color="#ffffff" />
        </SquishyPressable>

        <SquishyPressable
          testID="fab-manual-entry"
          onPress={openManualEntry}
          style={[fabStyle, perfect.cardShadow]}
          accessibilityRole="button"
          accessibilityLabel="Add ticket manually"
        >
          <FontAwesomeIcon icon={faPlus} size={20} color="#ffffff" />
        </SquishyPressable>

        <SquishyPressable
          onPress={() => setIsMapOpen(true)}
          style={[fabStyle, perfect.cardShadow]}
          accessibilityRole="button"
          accessibilityLabel="View tickets on map"
        >
          <FontAwesomeIcon icon={faMap} size={20} color="#ffffff" />
        </SquishyPressable>
      </View>

      {/* Map Modal */}
      <Modal
        visible={isMapOpen}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={{ flex: 1 }}>
          <TicketsMapView tickets={((filteredTicketsData as any)?.tickets || []) as any} />

          {/* Close button */}
          <Pressable
            onPress={() => setIsMapOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close map"
            style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 16,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 5,
            }}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color="#222222" />
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default TicketsScreen;
