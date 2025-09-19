import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { type Address } from '@parking-ticket-pal/types';

type MapboxFeature = {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  address?: string;
  properties: any;
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
};

type AddressInputProps = {
  onSelect: (address: Address) => void;
  initialValue?: string;
  placeholder?: string;
};

const AddressInput = ({ onSelect, initialValue = '', placeholder = 'Start typing an address' }: AddressInputProps) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      
      if (!mapboxToken) {
        console.warn('Mapbox token not found, address autocomplete disabled');
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?country=GB&types=address&autocomplete=true&access_token=${mapboxToken}`
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      } else {
        console.error('Mapbox API error:', response.status);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const parseMapboxFeature = (feature: MapboxFeature): Address => {
    const contextFeatures = feature.context || [];

    // Extract components from context
    const postcode = contextFeatures.find(item => item.id.includes('postcode'))?.text || '';
    const city = contextFeatures.find(item => item.id.includes('place'))?.text || '';
    const county = contextFeatures.find(item => item.id.includes('region'))?.text || '';
    const country = contextFeatures.find(item => item.id.includes('country'))?.text || 'United Kingdom';

    // Build address line
    const streetNumber = feature.address || '';
    const streetName = feature.text || '';
    const line1 = streetNumber ? `${streetNumber} ${streetName}` : streetName;

    return {
      line1,
      city,
      county,
      postcode,
      country,
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0],
      },
    };
  };

  const handleAddressSelect = (feature: MapboxFeature) => {
    const address = parseMapboxFeature(feature);
    setQuery(feature.place_name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelect(address);
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    
    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchAddresses(text);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <View className="relative">
      <View className="border border-gray-300 rounded-lg">
        <TextInput
          className="px-3 py-3 text-base"
          placeholder={placeholder}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {isLoading && (
          <View className="absolute right-3 top-3">
            <ActivityIndicator size="small" color="#666" />
          </View>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-lg mt-1 max-h-48">
          <ScrollView>
            {suggestions.map((feature, index) => (
              <Pressable
                key={feature.id || index}
                className="px-3 py-3 border-b border-gray-100 last:border-b-0"
                onPress={() => handleAddressSelect(feature)}
              >
                <Text className="text-base text-gray-900" numberOfLines={2}>
                  {feature.place_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default AddressInput;