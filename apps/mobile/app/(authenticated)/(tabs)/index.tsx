import { View, Text, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useMemo, useEffect } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faFilter, faArrowDownWideShort } from '@fortawesome/pro-regular-svg-icons';
import TicketsList from '@/components/TicketList/TicketsList';
import { useAnalytics } from '@/lib/analytics';
import NotificationBell from '@/components/NotificationBell';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import SearchBottomSheet from '@/components/TicketSearch/SearchBottomSheet';
import FilterBottomSheet from '@/components/TicketFilter/FilterBottomSheet';
import SortBottomSheet from '@/components/TicketSort/SortBottomSheet';
import { useTicketFilters } from '@/hooks/useTicketFilters';
import useTickets from '@/hooks/api/useTickets';
import { TicketStatus } from '@/types';
import { AdBanner } from '@/components/AdBanner';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const TicketsScreen = () => {
  const { trackEvent } = useAnalytics();
  const searchSheetRef = useRef<BottomSheet>(null);
  const filterSheetRef = useRef<BottomSheet>(null);
  const sortSheetRef = useRef<BottomSheet>(null);

  const {
    filters,
    search,
    updateSearch,
    updateIssuers,
    updateStatuses,
    updateSort,
    clearAllFilters,
    clearSearch,
    activeFilterCount,
  } = useTicketFilters();

  // Fetch all tickets (without filters) to get unique issuers and statuses
  const { data: allTicketsData } = useTickets();

  // Get filtered tickets data to check loading state and result count
  const { isFetching: isSearching, data: filteredTicketsData } = useTickets(filters);

  // Get unique issuer names from all tickets
  const availableIssuers = useMemo(() => {
    const ticketsData = allTicketsData as any;
    if (!ticketsData?.tickets) return [];
    const issuers = [...new Set(ticketsData.tickets.map((ticket: any) => ticket.issuer))];
    return issuers.filter(Boolean).sort() as string[];
  }, [allTicketsData]);

  // Get unique statuses from all tickets
  const availableStatuses = useMemo(() => {
    const ticketsData = allTicketsData as any;
    if (!ticketsData?.tickets) return [];
    const statuses = [...new Set(ticketsData.tickets.map((ticket: any) => ticket.status))];
    return statuses.filter(Boolean) as TicketStatus[];
  }, [allTicketsData]);


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

  const handleApplyFilters = () => {
    trackEvent('filters_applied', {
      issuerCount: filters.issuers?.length || 0,
      statusCount: filters.status?.length || 0,
      issuers: filters.issuers || [],
      statuses: filters.status || [],
      totalFilters: (filters.issuers?.length || 0) + (filters.status?.length || 0),
    });
    filterSheetRef.current?.close();
  };

  const handleSortChange = (sortBy: typeof filters.sortBy, sortOrder: 'asc' | 'desc') => {
    trackEvent('sort_applied', {
      sortBy,
      sortOrder,
      previousSortBy: filters.sortBy,
      previousSortOrder: filters.sortOrder,
    });
    updateSort(sortBy, sortOrder);
  };

  const handleClearFilters = () => {
    trackEvent('filters_cleared', {
      clearedIssuers: filters.issuers || [],
      clearedStatuses: filters.status || [],
      issuerCount: filters.issuers?.length || 0,
      statusCount: filters.status?.length || 0,
    });
  };

  const handleClearSort = () => {
    trackEvent('sort_cleared', {
      previousSortBy: filters.sortBy,
      previousSortOrder: filters.sortOrder,
    });
  };

  const selectedIssuers = useMemo(() => {
    return (filters.issuers || []) as string[];
  }, [filters.issuers]);

  const selectedStatuses = useMemo(() => {
    return (filters.status || []) as TicketStatus[];
  }, [filters.status]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-bold text-gray-900">
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
            <Text className="ml-2 text-sm text-gray-500 flex-1">
              {search || 'Search tickets...'}
            </Text>
          </SquishyPressable>

          {/* Filter Button - Show if multiple issuers or any statuses */}
          {(availableIssuers.length > 1 || availableStatuses.length > 0) && (
            <SquishyPressable
              onPress={handleOpenFilter}
              className="relative bg-gray-50 border border-gray-200 rounded-xl p-3"
            >
              <FontAwesomeIcon icon={faFilter} size={20} color="#6b7280" />
              {activeFilterCount > 0 && (
                <View className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full items-center justify-center">
                  <Text className="text-white text-xs font-bold">{activeFilterCount}</Text>
                </View>
              )}
            </SquishyPressable>
          )}

          {/* Sort Button */}
          <SquishyPressable
            onPress={handleOpenSort}
            className="bg-gray-50 border border-gray-200 rounded-xl p-3"
          >
            <FontAwesomeIcon icon={faArrowDownWideShort} size={20} color="#6b7280" />
          </SquishyPressable>
        </View>
      </View>

      <AdBanner placement="tickets" />

      <View className="flex-1 bg-gray-50">
        <View
          className="flex-1"
          style={{
            marginTop: padding,
            width: screenWidth,
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

      {(availableIssuers.length > 1 || availableStatuses.length > 0) && (
        <FilterBottomSheet
          ref={filterSheetRef}
          availableIssuers={availableIssuers}
          availableStatuses={availableStatuses}
          selectedIssuers={selectedIssuers}
          selectedStatuses={selectedStatuses}
          onIssuersChange={updateIssuers}
          onStatusesChange={updateStatuses}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      )}

      <SortBottomSheet
        ref={sortSheetRef}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder || 'desc'}
        onSortChange={handleSortChange}
        onClear={handleClearSort}
      />
    </SafeAreaView>
  );
}

export default TicketsScreen;
