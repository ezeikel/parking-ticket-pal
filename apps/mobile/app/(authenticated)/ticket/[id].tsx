import { View, Text, ScrollView, Dimensions, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarDays,
  faCircleSterling,
  faFileLines,
  faArrowLeft,
  faLocationDot,
  faCarSide as faCarSideRegular,
  faStar,
} from '@fortawesome/pro-regular-svg-icons';
import { faCarSide } from '@fortawesome/pro-solid-svg-icons';
import { format } from 'date-fns';
import { useRef, useCallback, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import useTicket from '@/hooks/api/useTicket';
import { TicketUpgradeButton } from '@/components/TicketUpgradeButton';
import { Address } from '@parking-ticket-pal/types';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import PremiumActionsBottomSheet from '@/components/PremiumActionsBottomSheet';
import ChallengeLetterBottomSheet from '@/components/ChallengeLetterBottomSheet';
import FormsBottomSheet from '@/components/FormsBottomSheet';
import { FormType } from '@/constants/challenges';
import { usePurchases } from '@/contexts/purchases';
import { AdBanner } from '@/components/AdBanner';

type TicketTier = 'FREE' | 'STANDARD' | 'PREMIUM';

const padding = 16;
const screenWidth = Dimensions.get('screen').width - padding * 2;

type InfoItemProps = {
  icon: any;
  label: string;
  value: string;
  description?: string;
};

const InfoItem = ({ icon, label, value, description }: InfoItemProps) => (
  <View className="mb-6">
    <View className="flex-row items-start">
      <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
        <FontAwesomeIcon icon={icon} size={18} color="#6b7280" />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-gray-500 mb-1">{label}</Text>
        <Text className="text-base font-jakarta-semibold text-gray-900">{value}</Text>
        {description && (
          <Text className="text-xs text-gray-500 mt-1">{description}</Text>
        )}
      </View>
    </View>
  </View>
);

export default function TicketDetailScreen() {
  console.log('TicketDetailScreen');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, refetch } = useTicket(id!);
  const { hasActiveSubscription, hasPremiumAccess, hasStandardAccess } = usePurchases();

  // Bottom sheet refs
  const premiumActionsSheetRef = useRef<BottomSheet>(null);
  const challengeLetterSheetRef = useRef<BottomSheet>(null);
  const formsSheetRef = useRef<BottomSheet>(null);

  // Track selected form type with state so component re-renders
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);

  // Track pending action to open after premium sheet closes (using ref to avoid stale closure)
  const pendingActionRef = useRef<'challenge-letter' | FormType | null>(null);

  const handlePremiumActionSelect = (action: 'challenge-letter' | FormType) => {
    pendingActionRef.current = action;
    premiumActionsSheetRef.current?.close();
  };

  // Handle opening the next sheet when premium actions sheet closes
  const handlePremiumActionsSheetChange = useCallback((index: number) => {
    // When sheet is fully closed (index === -1), open the next sheet
    if (index === -1 && pendingActionRef.current) {
      if (pendingActionRef.current === 'challenge-letter') {
        challengeLetterSheetRef.current?.snapToIndex(0);
      } else {
        setSelectedFormType(pendingActionRef.current);
        formsSheetRef.current?.snapToIndex(0);
      }
      pendingActionRef.current = null;
    }
  }, []);

  const handleSuccess = () => {
    challengeLetterSheetRef.current?.close();
    formsSheetRef.current?.close();
    refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Loader />
      </SafeAreaView>
    );
  }

  if (!data?.ticket) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Ticket not found</Text>
      </SafeAreaView>
    );
  }

  const { ticket } = data;
  // Type assertion for API response (backend returns these properties)
  const ticketData = ticket as any;
  const location = ticketData.location as Address | null;

  // Format dates
  const issuedDate = format(new Date(ticketData.issuedAt), 'dd MMM yyyy');
  const contraventionDate = format(new Date(ticketData.contraventionAt), 'dd MMM yyyy');

  // Calculate amount
  const amount = `£${(ticketData.initialAmount / 100).toFixed(2)}`;

  // Get tier badge info
  const getTierInfo = (tier: TicketTier) => {
    switch (tier) {
      case 'FREE':
        return { bg: '#f3f4f6', text: '#6b7280', label: 'Free' };
      case 'STANDARD':
        return { bg: '#dbeafe', text: '#2563eb', label: 'Standard' };
      case 'PREMIUM':
        return { bg: '#f3e8ff', text: '#9333ea', label: 'Premium' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', label: 'Unknown' };
    }
  };

  const tierInfo = getTierInfo(ticketData.tier);

  // Function to open location in maps
  const openInMaps = () => {
    if (!location?.coordinates) return;

    const { latitude, longitude } = location.coordinates;
    const label = location.line1 || 'Ticket Location';

    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}0,0?q=${label}@${latLng}`,
      android: `${scheme}${latLng}?q=${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const hasCoordinates = location?.coordinates?.latitude && location?.coordinates?.longitude;

  // Check if user has premium access for this ticket
  const hasPremiumFeatures =
    ticketData.tier === 'PREMIUM' ||
    hasActiveSubscription ||
    hasPremiumAccess ||
    hasStandardAccess;

  return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        className="border-b border-gray-200 pb-4"
        style={{
          marginTop: padding,
          width: screenWidth,
          alignSelf: 'center',
        }}
      >
        <View className="flex-row justify-between items-center mb-4">
          <SquishyPressable onPress={() => router.back()}>
            <View className="flex-row items-center">
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#6b7280" />
              <Text className="ml-2 text-gray-600">Back</Text>
            </View>
          </SquishyPressable>

          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: tierInfo.bg }}
          >
            <Text
              className="text-sm font-jakarta-semibold"
              style={{ color: tierInfo.text }}
            >
              {tierInfo.label}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-2xl font-jakarta-bold text-gray-900 mb-1">
            {ticketData.pcnNumber}
          </Text>
          <Text className="text-gray-600">{ticketData.issuer}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: padding,
          paddingBottom: padding * 2,
          width: screenWidth,
          alignSelf: 'center',
        }}
      >
        {/* Upgrade CTA */}
        <View className="mb-6">
          <TicketUpgradeButton
            ticketId={ticketData.id}
            currentTier={ticketData.tier}
            onUpgradeComplete={() => {
              // Refresh ticket data after upgrade
              refetch();
            }}
          />
        </View>

        {/* Premium Actions Button */}
        {hasPremiumFeatures && (
          <View className="mb-6">
            <SquishyPressable onPress={() => premiumActionsSheetRef.current?.snapToIndex(0)}>
              <View className="bg-purple-600 rounded-xl p-4 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-white rounded-lg items-center justify-center mr-3" style={{ opacity: 0.2 }}>
                    <FontAwesomeIcon icon={faStar} size={18} color="#9333ea" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-jakarta-bold text-base mb-1">
                      Premium Actions
                    </Text>
                    <Text className="text-white text-sm" style={{ opacity: 0.8 }}>
                      Generate letters & forms
                    </Text>
                  </View>
                </View>
              </View>
            </SquishyPressable>
          </View>
        )}

        {/* Details */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <Text className="text-lg font-jakarta-semibold text-gray-900 mb-4">
            Ticket Details
          </Text>

          <InfoItem
            icon={faCarSideRegular}
            label="Vehicle"
            value={ticketData.vehicle?.registrationNumber || 'N/A'}
          />

          <InfoItem
            icon={faCalendarDays}
            label="Date Issued"
            value={issuedDate}
          />

          <InfoItem
            icon={faCalendarDays}
            label="Contravention Date"
            value={contraventionDate}
          />

          <InfoItem
            icon={faCircleSterling}
            label="Initial Amount"
            value={amount}
          />

          <InfoItem
            icon={faLocationDot}
            label="Location"
            value={
              location
                ? `${location.line1}, ${location.city}, ${location.postcode}`
                : 'Location not available'
            }
          />

          <InfoItem
            icon={faFileLines}
            label="Contravention Code"
            value={ticketData.contraventionCode || 'N/A'}
          />
        </View>

        {/* Map Section */}
        {hasCoordinates && (
          <View className="mb-6">
            <View className="h-48 rounded-xl overflow-hidden border border-gray-200">
              <MapView
                style={{ flex: 1 }}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: location!.coordinates.latitude,
                  longitude: location!.coordinates.longitude,
                  latitudeDelta: 0.003,
                  longitudeDelta: 0.003,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: location!.coordinates.latitude,
                    longitude: location!.coordinates.longitude,
                  }}
                  title={location?.line1 || 'Ticket Location'}
                  description={`${location?.city}, ${location?.postcode}`}
                >
                  <View className="items-center justify-center size-8 bg-dark rounded-full shadow-lg">
                    <FontAwesomeIcon
                      icon={faCarSide}
                      size={15}
                      color="#ffffff"
                    />
                  </View>
                </Marker>
              </MapView>
            </View>
            <SquishyPressable onPress={openInMaps}>
              <View className="mt-3 bg-teal/10 border border-teal/20 rounded-lg p-3">
                <Text className="text-teal-dark text-sm text-center font-jakarta-medium">
                  Tap to open in Maps app
                </Text>
              </View>
            </SquishyPressable>
          </View>
        )}

        {/* Only show upgrade prompts for non-premium tiers */}
        {ticketData.tier === 'FREE' && (
          <View className="bg-teal/10 border border-teal/20 rounded-xl p-4 mb-6">
            <Text className="text-sm font-jakarta-semibold text-teal-dark mb-2">
              Upgrade to unlock more features
            </Text>
            <Text className="text-sm text-teal-dark mb-3">
              • Standard: Get reminders for important deadlines{'\n'}
              • Premium: Challenge letters, TE/PE forms, and more
            </Text>
          </View>
        )}

        {ticketData.tier === 'STANDARD' && (
          <View className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <Text className="text-sm font-jakarta-semibold text-purple-900 mb-2">
              Upgrade to Premium
            </Text>
            <Text className="text-sm text-purple-700">
              Generate challenge letters, TE/PE forms, and get AI-powered predictions
              to maximize your chances of winning.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Banner Ad */}
      <AdBanner placement="ticket-detail" />

      {/* Bottom Sheets */}
      <PremiumActionsBottomSheet
        ref={premiumActionsSheetRef}
        issuerType={ticketData.issuerType}
        onActionSelect={handlePremiumActionSelect}
        onChange={handlePremiumActionsSheetChange}
      />

      <ChallengeLetterBottomSheet
        ref={challengeLetterSheetRef}
        pcnNumber={ticketData.pcnNumber}
        issuerType={ticketData.issuerType}
        onSuccess={handleSuccess}
      />

      <FormsBottomSheet
        ref={formsSheetRef}
        pcnNumber={ticketData.pcnNumber}
        formType={selectedFormType || 'TE7'}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}
