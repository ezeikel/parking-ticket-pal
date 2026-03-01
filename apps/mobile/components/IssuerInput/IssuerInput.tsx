import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANIES,
  TRANSPORT_AUTHORITIES,
  slugToDisplayName,
} from '@parking-ticket-pal/constants';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

type IssuerEntry = {
  id: string;
  name: string;
  type: 'council' | 'private';
};

type IssuerInputProps = {
  onSelect: (issuer: string) => void;
  initialValue?: string;
  issuerType?: 'council' | 'private' | null;
  placeholder?: string;
  testID?: string;
};

const ALL_ISSUERS: IssuerEntry[] = [
  ...LOCAL_AUTHORITY_IDS.map((id) => ({
    id,
    name: slugToDisplayName(id),
    type: 'council' as const,
  })),
  ...TRANSPORT_AUTHORITIES.map((ta) => ({
    id: ta.id,
    name: ta.name,
    type: 'council' as const,
  })),
  ...PRIVATE_COMPANIES.map((pc) => ({
    id: pc.id,
    name: pc.name,
    type: 'private' as const,
  })),
].sort((a, b) => a.name.localeCompare(b.name));

const IssuerInput = ({
  onSelect,
  initialValue = '',
  issuerType = null,
  placeholder = 'Search for issuer',
  testID,
}: IssuerInputProps) => {
  const [query, setQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredByType = useMemo(() => {
    if (!issuerType) return ALL_ISSUERS;
    return ALL_ISSUERS.filter((i) => i.type === issuerType);
  }, [issuerType]);

  const [suggestions, setSuggestions] = useState<IssuerEntry[]>([]);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lower = searchQuery.toLowerCase();
    const matches = filteredByType.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        i.id.toLowerCase().includes(lower),
    );
    setSuggestions(matches.slice(0, 20));
    setShowSuggestions(matches.length > 0);
  };

  const handleTextChange = (text: string) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  const handleSelect = (issuer: IssuerEntry) => {
    setQuery(issuer.name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelect(issuer.name);
  };

  return (
    <View>
      <View className="border border-gray-300 rounded-lg">
        <TextInput
          testID={testID}
          className="px-4 py-3 text-base font-jakarta"
          placeholder={placeholder}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View
          className="bg-white border border-gray-300 rounded-lg mt-2"
          style={{ maxHeight: 200 }}
        >
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {suggestions.map((issuer, index) => (
              <SquishyPressable
                key={`${issuer.id}-${index}`}
                className="px-3 py-3 border-b border-gray-100"
                onPress={() => handleSelect(issuer)}
              >
                <Text
                  className="text-base text-gray-900 font-jakarta"
                  numberOfLines={1}
                >
                  {issuer.name}
                </Text>
              </SquishyPressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default IssuerInput;
