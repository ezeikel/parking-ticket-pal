import { View, Text, Platform, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot } from '@fortawesome/pro-solid-svg-icons';
import { Address } from '@parking-ticket-pal/types';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type LocationCardProps = {
  location: Address | null;
};

export default function LocationCard({ location }: LocationCardProps) {
  const hasCoordinates = location?.coordinates?.latitude && location?.coordinates?.longitude;
  const addressDisplay = location?.line1 || 'Unknown location';

  const openInMaps = () => {
    if (!location?.coordinates) return;
    const { latitude, longitude } = location.coordinates;
    const label = location.line1 || 'Ticket Location';
    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}0,0?q=${label}@${latLng}`,
      android: `${scheme}${latLng}?q=${latLng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      <Text className="font-jakarta-semibold text-lg text-dark mb-4">
        Ticket Location
      </Text>

      {hasCoordinates ? (
        <>
          <View className="h-48 rounded-xl overflow-hidden">
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
                  <FontAwesomeIcon icon={faLocationDot} size={15} color="#ffffff" />
                </View>
              </Marker>
            </MapView>
          </View>

          <SquishyPressable onPress={openInMaps}>
            <View className="mt-3 bg-teal/10 border border-teal/20 rounded-xl p-3">
              <Text className="text-teal-dark text-sm text-center font-jakarta-medium">
                Tap to open in Maps app
              </Text>
            </View>
          </SquishyPressable>
        </>
      ) : (
        <View className="h-48 rounded-xl bg-light items-center justify-center">
          <View className="items-center">
            <FontAwesomeIcon icon={faLocationDot} size={28} color="#1abc9c" />
            <Text className="font-jakarta text-sm text-gray mt-2">
              No coordinates available
            </Text>
          </View>
        </View>
      )}

      <View className="flex-row items-center gap-2 mt-3">
        <FontAwesomeIcon icon={faLocationDot} size={14} color="#717171" />
        <Text className="font-jakarta text-sm text-gray">{addressDisplay}</Text>
      </View>
    </View>
  );
}
