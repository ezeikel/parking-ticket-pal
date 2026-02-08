'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faChevronDown,
  faCheck,
  faXmark,
  faGavel,
} from '@fortawesome/pro-solid-svg-icons';
import { STATUTORY_GROUNDS, type StatutoryGround } from '@/constants/statutory-grounds';
import cn from '@/utils/cn';

type StatutoryGroundsSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
};

const StatutoryGroundsSelect = ({
  value = [],
  onChange,
  placeholder = 'Select statutory ground(s)',
  className,
}: StatutoryGroundsSelectProps) => {
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

  // Filter grounds by search
  const filteredGrounds = useMemo(() => {
    if (!search) return STATUTORY_GROUNDS;

    const searchLower = search.toLowerCase();
    return STATUTORY_GROUNDS.filter(
      (ground) =>
        ground.label.toLowerCase().includes(searchLower) ||
        ground.shortLabel.toLowerCase().includes(searchLower) ||
        ground.description.toLowerCase().includes(searchLower),
    );
  }, [search]);

  const selectedGrounds = useMemo(() => {
    return value
      .map((id) => STATUTORY_GROUNDS.find((g) => g.id === id))
      .filter((g): g is StatutoryGround => g !== undefined);
  }, [value]);

  const handleToggle = (groundId: string) => {
    const newValue = value.includes(groundId)
      ? value.filter((id) => id !== groundId)
      : [...value, groundId];
    onChange(newValue);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearch('');
  };

  const displayText = useMemo(() => {
    if (selectedGrounds.length === 0) return placeholder;
    if (selectedGrounds.length === 1) return selectedGrounds[0].shortLabel;
    return `${selectedGrounds.length} grounds selected`;
  }, [selectedGrounds, placeholder]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm transition-[color,box-shadow] outline-none',
          'focus:border-teal focus:ring-1 focus:ring-teal',
          value.length === 0 && 'text-gray',
        )}
      >
        <span className="truncate text-left">{displayText}</span>
        <div className="flex items-center gap-1">
          {value.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) =>
                e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)
              }
              className="rounded p-0.5 hover:bg-light"
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
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[320px] max-w-[min(100vw-2rem,500px)] rounded-lg border border-border bg-white shadow-lg md:min-w-[400px]">
          {/* Search Input */}
          <div className="border-b border-border p-2">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search grounds..."
                className="w-full rounded-md border border-border bg-transparent py-2 pl-8 pr-3 text-sm outline-none placeholder:text-gray focus:border-teal focus:ring-1 focus:ring-teal"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray">
              {filteredGrounds.length} ground{filteredGrounds.length !== 1 && 's'}{' '}
              {search && `matching "${search}"`}
              {value.length > 0 && ` (${value.length} selected)`}
            </p>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto overscroll-contain md:max-h-[400px]">
            {filteredGrounds.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray">
                No grounds found matching &ldquo;{search}&rdquo;
              </div>
            ) : (
              <div className="py-1">
                {filteredGrounds.map((ground) => {
                  const isSelected = value.includes(ground.id);

                  return (
                    <button
                      key={ground.id}
                      type="button"
                      onClick={() => handleToggle(ground.id)}
                      className={cn(
                        'flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-light',
                        isSelected && 'bg-light',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                          isSelected
                            ? 'border-teal bg-teal text-white'
                            : 'border-border bg-white',
                        )}
                      >
                        {isSelected && (
                          <FontAwesomeIcon icon={faCheck} className="size-2.5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-dark">{ground.label}</p>
                        <p className="mt-0.5 text-xs text-gray">
                          {ground.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border bg-light/50 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs text-gray">
              <FontAwesomeIcon icon={faGavel} className="size-3" />
              Select all grounds that apply to your case
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatutoryGroundsSelect;
