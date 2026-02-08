'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faChevronDown,
  faCheck,
  faRoad,
  faSquareParking,
  faCar,
  faXmark,
} from '@fortawesome/pro-solid-svg-icons';
import {
  CONTRAVENTION_CODES,
  type CodeCategory,
} from '@parking-ticket-pal/constants';
import cn from '@/utils/cn';

type ContraventionCodeSelectProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const CATEGORY_CONFIG: Record<
  CodeCategory,
  { label: string; icon: typeof faRoad }
> = {
  'on-street': { label: 'On-Street', icon: faRoad },
  'off-street': { label: 'Off-Street', icon: faSquareParking },
  'moving-traffic': { label: 'Moving Traffic', icon: faCar },
};

const CATEGORY_ORDER: CodeCategory[] = [
  'on-street',
  'off-street',
  'moving-traffic',
];

const ContraventionCodeSelect = ({
  value,
  onChange,
  placeholder = 'Select a contravention code',
  className,
}: ContraventionCodeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Group and filter codes
  const groupedCodes = useMemo(() => {
    const searchLower = search.toLowerCase();

    const groups: Record<CodeCategory, typeof CONTRAVENTION_CODES[string][]> = {
      'on-street': [],
      'off-street': [],
      'moving-traffic': [],
    };

    Object.values(CONTRAVENTION_CODES).forEach((code) => {
      // Filter by search term
      if (
        search &&
        !code.code.toLowerCase().includes(searchLower) &&
        !code.description.toLowerCase().includes(searchLower)
      ) {
        return;
      }

      groups[code.category].push(code);
    });

    // Sort each group by code number
    Object.values(groups).forEach((group) =>
      group.sort((a, b) => parseInt(a.code) - parseInt(b.code)),
    );

    return groups;
  }, [search]);

  const totalResults = Object.values(groupedCodes).reduce(
    (acc, group) => acc + group.length,
    0,
  );

  const selectedCode = value
    ? CONTRAVENTION_CODES[value.replace(/[a-z0-9]$/i, '')] ||
      CONTRAVENTION_CODES[value]
    : null;

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          !value && 'text-muted-foreground',
        )}
      >
        <span className="truncate text-left">
          {selectedCode
            ? `${value} - ${selectedCode.description.slice(0, 50)}${selectedCode.description.length > 50 ? '...' : ''}`
            : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="rounded p-0.5 hover:bg-muted"
            >
              <FontAwesomeIcon
                icon={faXmark}
                className="size-3 opacity-50 hover:opacity-100"
              />
            </span>
          )}
          <FontAwesomeIcon
            icon={faChevronDown}
            className={cn(
              'size-3 opacity-50 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[320px] max-w-[min(100vw-2rem,500px)] rounded-md border bg-popover shadow-lg md:min-w-[400px]">
          {/* Search Input */}
          <div className="border-b p-2">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code or description..."
                className="w-full rounded-md border bg-transparent py-2 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {totalResults} codes found
              {search && ` for "${search}"`}
            </p>
          </div>

          {/* Grouped Results */}
          <div className="max-h-[300px] overflow-y-auto overscroll-contain md:max-h-[400px]">
            {totalResults === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No codes found matching &ldquo;{search}&rdquo;
              </div>
            ) : (
              CATEGORY_ORDER.map((category) => {
                const codes = groupedCodes[category];
                if (codes.length === 0) return null;

                const config = CATEGORY_CONFIG[category];

                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted/80 px-3 py-2 backdrop-blur-sm">
                      <FontAwesomeIcon
                        icon={config.icon}
                        className="size-3.5 text-muted-foreground"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        ({codes.length})
                      </span>
                    </div>

                    {/* Code Items */}
                    <div className="py-1">
                      {codes.map((code) => {
                        const isSelected =
                          value === code.code ||
                          value?.replace(/[a-z0-9]$/i, '') === code.code;

                        return (
                          <button
                            key={code.code}
                            type="button"
                            onClick={() => handleSelect(code.code)}
                            className={cn(
                              'flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                              isSelected && 'bg-accent',
                            )}
                          >
                            <span className="flex h-6 min-w-[2.5rem] items-center justify-center rounded bg-muted font-mono text-xs font-medium">
                              {code.code}
                            </span>
                            <span className="flex-1 text-sm leading-relaxed">
                              {code.description}
                            </span>
                            {isSelected && (
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="mt-1 size-3 text-primary"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Suffix hint */}
          <div className="border-t bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Tip: You can add a suffix (e.g., &ldquo;01a&rdquo;) after selecting a
              code
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContraventionCodeSelect;
