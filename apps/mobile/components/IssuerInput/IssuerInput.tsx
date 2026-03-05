import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Keyboard, Pressable } from 'react-native';
import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANIES,
  TRANSPORT_AUTHORITIES,
  ISSUER_ADDRESSES,
  slugToDisplayName,
} from '@parking-ticket-pal/constants';


type IssuerEntry = {
  id: string;
  name: string;
  shortName: string;
};

type IssuerInputProps = {
  onSelect: (issuer: string) => void;
  initialValue?: string;
  placeholder?: string;
  testID?: string;
};

const ALL_ISSUERS: IssuerEntry[] = [
  ...LOCAL_AUTHORITY_IDS.map((id) => ({
    id,
    name: ISSUER_ADDRESSES[id]?.formalName || slugToDisplayName(id),
    shortName: slugToDisplayName(id),
  })),
  ...TRANSPORT_AUTHORITIES.map((ta) => ({
    id: ta.id,
    name: ISSUER_ADDRESSES[ta.id]?.formalName || ta.name,
    shortName: ta.name,
  })),
  ...PRIVATE_COMPANIES.map((pc) => ({
    id: pc.id,
    name: ISSUER_ADDRESSES[pc.id]?.formalName || pc.name,
    shortName: pc.name,
  })),
].sort((a, b) => a.name.localeCompare(b.name));

const IssuerInput = ({
  onSelect,
  initialValue = '',
  placeholder = 'Search for issuer...',
  testID,
}: IssuerInputProps) => {
  const [query, setQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [suggestions, setSuggestions] = useState<IssuerEntry[]>([]);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lower = searchQuery.toLowerCase();
    const matches = ALL_ISSUERS.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        i.shortName.toLowerCase().includes(lower) ||
        i.id.toLowerCase().includes(lower),
    );
    setSuggestions(matches.slice(0, 20));
    setShowSuggestions(true);
  };

  const handleTextChange = (text: string) => {
    setQuery(text);

    if (manualMode) {
      onSelect(text);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  const inputRef = useRef<TextInput>(null);

  const handleSelect = (issuer: IssuerEntry) => {
    setQuery(issuer.name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelect(issuer.name);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleEnterManually = () => {
    setManualMode(true);
    setShowSuggestions(false);
    setSuggestions([]);
    // Accept current query as the value
    if (query) {
      onSelect(query);
    }
  };

  const handleBlur = () => {
    if (manualMode) {
      if (query) onSelect(query);
      return;
    }
    // Auto-select if typed text exactly matches an issuer name (case-insensitive)
    const exactMatch = ALL_ISSUERS.find(
      (i) => i.name.toLowerCase() === query.trim().toLowerCase(),
    );
    if (exactMatch) {
      handleSelect(exactMatch);
    }
  };

  return (
    <View>
      <View className="border border-gray-300 rounded-lg">
        <TextInput
          ref={inputRef}
          testID={testID}
          className="px-4 py-3 text-base font-jakarta"
          placeholder={placeholder}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (!manualMode && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
        />
      </View>

      {showSuggestions && !manualMode && (
        <View
          className="bg-white border border-gray-300 rounded-lg mt-2"
          style={{ maxHeight: 200 }}
        >
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map((issuer, index) => (
              <Pressable
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
              </Pressable>
            ))}
            {query.length >= 2 && (
              <Pressable
                className="px-3 py-3 border-b border-gray-100"
                onPress={handleEnterManually}
              >
                <Text className="text-base text-gray-500 font-jakarta italic">
                  Not on this list? Enter manually
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default IssuerInput;
