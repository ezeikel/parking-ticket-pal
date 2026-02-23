import { useRef, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot } from '@fortawesome/pro-solid-svg-icons';
import { Ticket, TicketStatus } from '@/types';
import {
  getStatusConfig,
  getDeadlineDays,
  getDisplayAmount,
  formatCurrency,
  isTerminalStatus,
} from '@/constants/ticket-status';

type TicketsMapViewProps = {
  tickets: Ticket[];
};

// Status-based marker colors matching web
function getMarkerColor(status: TicketStatus): string {
  const config = getStatusConfig(status);
  // Map the text color categories to pin colors
  switch (config.label) {
    case 'Needs Action':
      return '#F59E0B'; // amber
    case 'Pending':
      return '#1ABC9C'; // teal
    case 'Won':
      return '#00A699'; // teal-dark
    case 'Lost':
    case 'Overdue':
      return '#FF5A5F'; // coral
    case 'Paid':
    case 'Cancelled':
      return '#64748B'; // slate
    default:
      return '#64748B';
  }
}

// Default to London
const DEFAULT_REGION = {
  latitude: 51.509865,
  longitude: -0.118092,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export default function TicketsMapView({ tickets }: TicketsMapViewProps) {
  const mapRef = useRef<MapView>(null);

  // Filter tickets with valid coordinates
  const ticketsWithCoords = tickets.filter((t) => {
    const loc = t.location as any;
    return loc?.coordinates?.latitude && loc?.coordinates?.longitude;
  });

  // Fit map to all markers on initial load
  const handleMapReady = useCallback(() => {
    if (ticketsWithCoords.length > 0 && mapRef.current) {
      const coords = ticketsWithCoords.map((t) => {
        const loc = t.location as any;
        return {
          latitude: loc.coordinates.latitude,
          longitude: loc.coordinates.longitude,
        };
      });
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: false,
      });
    }
  }, [ticketsWithCoords]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={DEFAULT_REGION}
        onMapReady={handleMapReady}
        showsUserLocation
        showsMyLocationButton
      >
        {ticketsWithCoords.map((ticket) => {
          const loc = ticket.location as any;
          const color = getMarkerColor(ticket.status);
          const deadlineDays = getDeadlineDays(ticket.issuedAt);
          const amount = formatCurrency(getDisplayAmount(ticket));
          const terminal = isTerminalStatus(ticket.status);
          const statusConfig = getStatusConfig(ticket.status);

          return (
            <Marker
              key={ticket.id}
              coordinate={{
                latitude: loc.coordinates.latitude,
                longitude: loc.coordinates.longitude,
              }}
              onCalloutPress={() => router.push(`/ticket/${ticket.id}`)}
            >
              {/* Custom pin marker */}
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
                  <FontAwesomeIcon icon={faLocationDot} size={16} color="#ffffff" />
                </View>
                {/* Pin tail */}
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 8,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: color,
                    marginTop: -1,
                  }}
                />
              </View>

              {/* Callout popup */}
              <Callout tooltip>
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    padding: 12,
                    width: 220,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  {/* PCN + Status */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontSize: 14, color: '#222222' }}>
                      {ticket.pcnNumber}
                    </Text>
                    <View
                      style={{
                        backgroundColor: statusConfig.bgColor,
                        borderRadius: 99,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontFamily: 'PlusJakartaSans-Medium', fontSize: 10, color: statusConfig.textColor }}>
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  {/* Location */}
                  <Text style={{ fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: '#717171', marginBottom: 4 }} numberOfLines={1}>
                    {loc?.line1 || 'Unknown location'}
                  </Text>

                  {/* Amount */}
                  <Text style={{ fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, color: '#222222', marginBottom: 4 }}>
                    {amount}
                  </Text>

                  {/* Deadline */}
                  {!terminal && deadlineDays <= 14 && (
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans-Medium',
                        fontSize: 11,
                        color: deadlineDays <= 0 ? '#FF5A5F' : '#D97706',
                      }}
                    >
                      {deadlineDays <= 0 ? 'Overdue' : `Due in ${deadlineDays} day${deadlineDays !== 1 ? 's' : ''}`}
                    </Text>
                  )}

                  {/* Tap to view */}
                  <Text style={{ fontFamily: 'PlusJakartaSans-Medium', fontSize: 10, color: '#1abc9c', marginTop: 6 }}>
                    Tap to view details →
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Empty state overlay */}
      {ticketsWithCoords.length === 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 16,
            right: 16,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderCurve: 'continuous',
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text style={{ fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: '#222222' }}>
            No locations to display
          </Text>
          <Text style={{ fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: '#717171', marginTop: 4, textAlign: 'center' }}>
            Tickets with location data will appear as pins on the map
          </Text>
        </View>
      )}
    </View>
  );
}
