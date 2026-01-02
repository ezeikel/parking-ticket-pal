import { View, Text, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useMemo, useEffect, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faFilter, faArrowDownWideShort, faImage } from '@fortawesome/pro-regular-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import TicketsList from '@/components/TicketList/TicketsList';
import { useAnalytics, getOCRAnalyticsProperties, getTicketFormAnalyticsProperties } from '@/lib/analytics';
import NotificationBell from '@/components/NotificationBell';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import SearchBottomSheet from '@/components/TicketSearch/SearchBottomSheet';
import FilterBottomSheet from '@/components/TicketFilter/FilterBottomSheet';
import SortBottomSheet from '@/components/TicketSort/SortBottomSheet';
import { useTicketFilters } from '@/hooks/useTicketFilters';
import useTickets from '@/hooks/api/useTickets';
import { TicketStatus } from '@/types';
import { AdBanner } from '@/components/AdBanner';
import TicketForm from '@/components/TicketForm/TicketForm';
import useOCR from '@/hooks/api/useOCR';
import useCreateTicket from '@/hooks/api/useUploadTicket';
import { useLogger, logScannerIssue } from '@/lib/logger';
import Loader from '@/components/Loader/Loader';
import { adService } from '@/services/AdService';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

const TicketsScreen = () => {
  const { trackEvent, trackError } = useAnalytics();
  const logger = useLogger();
  const searchSheetRef = useRef<BottomSheet>(null);
  const filterSheetRef = useRef<BottomSheet>(null);
  const sortSheetRef = useRef<BottomSheet>(null);

  // TODO: Temporary photo import functionality. This should be consolidated into the camera tab
  // once react-native-document-scanner-plugin v2 stabilizes or an alternative solution
  // allows gallery access from within the camera view (similar to iOS Camera app UX).
  // For now, this provides users with a way to import existing photos.
  const [importedImage, setImportedImage] = useState<string>();
  const [ocrData, setOcrData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const ocrMutation = useOCR();
  const createTicketMutation = useCreateTicket();

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

  // TODO: Photo import handler - temporary solution until camera tab supports gallery access
  const handlePhotoImport = async () => {
    try {
      trackEvent("photo_import_initiated", { source: "tickets_header" });

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      trackEvent("photo_import_permission_result", {
        source: "tickets_header",
        granted: permissionResult.granted,
        can_ask_again: permissionResult.canAskAgain,
        status: permissionResult.status
      });

      if (permissionResult.granted === false) {
        logger.permissionError('Media library permission denied', {
          screen: "tickets",
          permission_type: "media_library",
          can_ask_again: permissionResult.canAskAgain,
          status: permissionResult.status
        });
        trackEvent("permission_denied", {
          screen: "tickets",
          error_type: "permission",
          error_message: "Media library permission denied"
        });
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to import existing photos. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
        exif: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled) {
        const imageUri = result.assets?.[0]?.base64;
        if (imageUri) {
          setImportedImage(imageUri);
          trackEvent("photo_import_success", {
            source: "tickets_header"
          });
          // Process image immediately
          await processImportedImage(imageUri);
        }
      } else {
        trackEvent("photo_import_cancelled", {
          source: "tickets_header"
        });
      }
    } catch (error) {
      logger.error('Photo import error', { screen: "tickets" }, error as Error);
      logScannerIssue('photo_import', error as Error, { source: "tickets_header" });
      trackError(error as Error, {
        screen: "tickets",
        action: "photo_import",
        errorType: "import"
      });

      Alert.alert(
        'Import Error',
        'Unable to import photo. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const processImportedImage = async (imageBase64: string) => {
    try {
      const startTime = Date.now();
      trackEvent("ocr_processing_started", { screen: "tickets", source: "photo_import" });

      const ocrResult = await ocrMutation.mutateAsync(imageBase64);

      if (ocrResult.success && ocrResult.data) {
        const processingTime = Date.now() - startTime;
        logger.logPerformance('ocr_processing', processingTime, {
          screen: "tickets",
          source: "photo_import",
          extracted_fields: Object.keys(ocrResult.data).length
        });

        const ocrProperties = getOCRAnalyticsProperties(ocrResult, startTime);
        trackEvent("ocr_processing_success", {
          screen: "tickets",
          source: "photo_import",
          ...ocrProperties
        });
        setOcrData(ocrResult);
        setShowForm(true);
      } else {
        logger.ocrError('OCR processing failed', undefined, {
          screen: "tickets",
          source: "photo_import",
          error_message: ocrResult.message,
          processing_time_ms: Date.now() - startTime
        });
        trackEvent("ocr_processing_failed", {
          screen: "tickets",
          source: "photo_import",
          error_message: ocrResult.message,
          processing_time_ms: Date.now() - startTime
        });
        Alert.alert('Error', 'Failed to process the image. Please try again.');
      }
    } catch (error) {
      logScannerIssue('ocr_process', error as Error, { screen: "tickets", source: "photo_import" });
      trackError(error as Error, {
        screen: "tickets",
        action: "process_ocr",
        source: "photo_import",
        errorType: "ocr"
      });
      Alert.alert('Error', 'Failed to process the image. Please try again.');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const ticketData = {
        ...formData,
        tempImageUrl: ocrData?.imageUrl,
        tempImagePath: ocrData?.tempImagePath,
        extractedText: ocrData?.data?.extractedText,
      };

      const formProperties = getTicketFormAnalyticsProperties(formData);
      trackEvent("ticket_form_submitted", {
        screen: "tickets",
        source: "photo_import",
        ...formProperties
      });

      const result = await createTicketMutation.mutateAsync(ticketData);

      if (result.success) {
        trackEvent("ticket_created", {
          screen: "tickets",
          source: "photo_import",
          ...formProperties
        });

        await adService.showAd();

        Alert.alert('Success', 'Ticket created successfully!', [
          { text: 'OK', onPress: () => {
            setShowForm(false);
            setImportedImage(undefined);
            setOcrData(null);
          }}
        ]);
      } else {
        trackError(result.error || 'Failed to create ticket', {
          screen: "tickets",
          action: "create_ticket",
          source: "photo_import",
          errorType: "network"
        });
        Alert.alert('Error', result.error || 'Failed to create ticket.');
      }
    } catch (error) {
      logger.error('Error creating ticket', { screen: "tickets", source: "photo_import" }, error as Error);
      trackError(error as Error, {
        screen: "tickets",
        action: "create_ticket",
        source: "photo_import",
        errorType: "network"
      });
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    }
  };

  const handleFormCancel = () => {
    trackEvent("ticket_form_cancelled", { screen: "tickets", source: "photo_import" });
    setShowForm(false);
    setImportedImage(undefined);
    setOcrData(null);
  };

  // Show ticket form if we have OCR data from imported photo
  if (showForm && ocrData) {
    const initialFormData = {
      vehicleReg: ocrData.data?.vehicleReg || '',
      pcnNumber: ocrData.data?.pcnNumber || '',
      issuedAt: ocrData.data?.issuedAt ? new Date(ocrData.data.issuedAt) : new Date(),
      contraventionCode: ocrData.data?.contraventionCode || '',
      initialAmount: ocrData.data?.initialAmount || 0,
      issuer: ocrData.data?.issuer || '',
      location: ocrData.data?.location || {
        line1: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      },
    };

    trackEvent("ticket_form_opened", {
      screen: "tickets",
      source: "photo_import",
      is_prefilled: true,
      ...getTicketFormAnalyticsProperties(initialFormData)
    });

    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <TicketForm
          initialData={initialFormData}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={createTicketMutation.isPending}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-bold text-gray-900">
            Tickets
          </Text>
          <View className="flex-row items-center gap-3">
            {/* TODO: Temporary photo import button. Remove once gallery access is integrated into camera tab */}
            <SquishyPressable
              onPress={handlePhotoImport}
              className="w-10 h-10 items-center justify-center"
              disabled={ocrMutation.isPending}
            >
              {ocrMutation.isPending ? (
                <Loader size={20} color="#6b7280" />
              ) : (
                <FontAwesomeIcon icon={faImage} size={22} color="#6b7280" />
              )}
            </SquishyPressable>
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

      {/* Banner Ad */}
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
