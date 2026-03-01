'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANIES,
  TRANSPORT_AUTHORITIES,
  slugToDisplayName,
} from '@parking-ticket-pal/constants';

const getPlaceholder = (issuerType: 'council' | 'private' | null) => {
  if (issuerType === 'council') return 'e.g. Lewisham, Westminster...';
  if (issuerType === 'private') return 'e.g. ParkingEye, Horizon...';
  return 'Search for issuer...';
};

type IssuerComboboxProps = {
  issuerType: 'council' | 'private' | null;
  value: string;
  onSelect: (name: string) => void;
  className?: string;
};

const IssuerCombobox = ({
  issuerType,
  value,
  onSelect,
  className,
}: IssuerComboboxProps) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const allOptions = useMemo(() => {
    if (issuerType === 'council') {
      return LOCAL_AUTHORITY_IDS.map((slug) => slugToDisplayName(slug));
    }
    if (issuerType === 'private') {
      return [
        ...PRIVATE_COMPANIES.map((c) => c.name),
        ...TRANSPORT_AUTHORITIES.map((t) => t.name),
      ];
    }
    // No filter — show all
    return [
      ...LOCAL_AUTHORITY_IDS.map((slug) => slugToDisplayName(slug)),
      ...PRIVATE_COMPANIES.map((c) => c.name),
      ...TRANSPORT_AUTHORITIES.map((t) => t.name),
    ];
  }, [issuerType]);

  const filtered = useMemo(() => {
    if (query.length < 2) return [];
    const lower = query.toLowerCase();
    return allOptions
      .filter((name) => name.toLowerCase().includes(lower))
      .slice(0, 20);
  }, [query, allOptions]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (name: string) => {
    setQuery(name);
    setIsOpen(false);
    onSelect(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          // Clear selection if user edits after selecting
          if (value && e.target.value !== value) {
            onSelect('');
          }
        }}
        onFocus={() => {
          if (query.length >= 2) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder(issuerType)}
        className="h-11"
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-input bg-background shadow-md"
        >
          {filtered.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(name);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full px-3 py-2 text-left text-sm ${
                  i === highlightedIndex
                    ? 'bg-teal/10 text-teal'
                    : 'text-dark hover:bg-light'
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IssuerCombobox;
