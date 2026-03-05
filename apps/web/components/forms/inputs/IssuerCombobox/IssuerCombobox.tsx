'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANIES,
  TRANSPORT_AUTHORITIES,
  slugToDisplayName,
} from '@parking-ticket-pal/constants';

type IssuerComboboxProps = {
  value: string;
  onSelect: (name: string) => void;
  className?: string;
};

const IssuerCombobox = ({
  value,
  onSelect,
  className,
}: IssuerComboboxProps) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const allOptions = useMemo(
    () =>
      [
        ...LOCAL_AUTHORITY_IDS.map((slug) => slugToDisplayName(slug)),
        ...PRIVATE_COMPANIES.map((c) => c.name),
        ...TRANSPORT_AUTHORITIES.map((t) => t.name),
      ].sort((a, b) => a.localeCompare(b)),
    [],
  );

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

  const handleEnterManually = () => {
    setManualMode(true);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const totalItems = filtered.length + (query.length >= 2 ? 1 : 0); // +1 for "not listed"
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === filtered.length) {
        handleEnterManually();
      } else if (filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showNotListed = query.length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <Input
        value={query}
        onChange={(e) => {
          const newValue = e.target.value;
          setQuery(newValue);
          if (!manualMode) {
            setIsOpen(true);
          }
          // In manual mode, update the value directly
          if (manualMode) {
            onSelect(newValue);
          }
          // Clear selection if user edits after selecting
          if (value && newValue !== value && !manualMode) {
            onSelect('');
          }
        }}
        onFocus={() => {
          if (!manualMode && query.length >= 2) setIsOpen(true);
        }}
        onBlur={() => {
          // In manual mode, accept whatever was typed
          if (manualMode && query) {
            onSelect(query);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search for issuer..."
        className="h-11"
        autoComplete="off"
      />
      {isOpen && (filtered.length > 0 || showNotListed) && !manualMode && (
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
          {showNotListed && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleEnterManually();
                }}
                onMouseEnter={() => setHighlightedIndex(filtered.length)}
                className={`w-full px-3 py-2 text-left text-sm italic ${
                  highlightedIndex === filtered.length
                    ? 'bg-teal/10 text-teal'
                    : 'text-muted-foreground hover:bg-light'
                }`}
              >
                Not on this list? Enter manually
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default IssuerCombobox;
