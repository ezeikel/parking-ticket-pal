import { useState, useCallback } from 'react';
import type { TicketFilters } from '../api';
import { TicketStatus } from '../types';

// Status filter categories matching the web app
export type StatusCategory = 'all' | 'needs_action' | 'pending' | 'won' | 'lost' | 'paid';

export const STATUS_CATEGORIES: { value: StatusCategory; label: string }[] = [
  { value: 'all', label: 'All Tickets' },
  { value: 'needs_action', label: 'Needs Action' },
  { value: 'pending', label: 'Pending' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_CATEGORY_MAP: Record<StatusCategory, TicketStatus[]> = {
  all: [],
  needs_action: [
    TicketStatus.ISSUED_DISCOUNT_PERIOD,
    TicketStatus.ISSUED_FULL_CHARGE,
    TicketStatus.NOTICE_TO_OWNER,
    TicketStatus.NOTICE_TO_KEEPER,
  ],
  pending: [
    TicketStatus.FORMAL_REPRESENTATION,
    TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR,
    TicketStatus.POPLA_APPEAL,
    TicketStatus.IAS_APPEAL,
    TicketStatus.APPEAL_TO_TRIBUNAL,
  ],
  won: [
    TicketStatus.REPRESENTATION_ACCEPTED,
    TicketStatus.APPEAL_UPHELD,
    TicketStatus.APPEAL_SUCCESSFUL,
  ],
  lost: [
    TicketStatus.NOTICE_OF_REJECTION,
    TicketStatus.APPEAL_REJECTED_BY_OPERATOR,
    TicketStatus.APPEAL_REJECTED,
  ],
  paid: [TicketStatus.PAID],
};

export function getStatusesForCategory(category: StatusCategory): TicketStatus[] {
  return STATUS_CATEGORY_MAP[category] ?? [];
}

// Sort options matching the web app
export type SortOption = 'newest' | 'deadline' | 'amount';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'deadline', label: 'Due Date' },
  { value: 'amount', label: 'Amount' },
];

export const useTicketFilters = () => {
  const [filters, setFilters] = useState<TicketFilters>({
    sortBy: 'issuedAt',
    sortOrder: 'desc',
  });

  const [search, setSearch] = useState('');
  const [statusCategory, setStatusCategory] = useState<StatusCategory>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const updateSearch = useCallback((value: string) => {
    setSearch(value);
    setFilters(prev => ({
      ...prev,
      search: value || undefined,
    }));
  }, []);

  const updateStatusCategory = useCallback((category: StatusCategory) => {
    setStatusCategory(category);
    const statuses = getStatusesForCategory(category);
    setFilters(prev => ({
      ...prev,
      status: statuses.length > 0 ? statuses : undefined,
    }));
  }, []);

  const updateIssuers = useCallback((issuers: string[]) => {
    setFilters(prev => ({
      ...prev,
      issuers: issuers.length > 0 ? issuers : undefined,
    }));
  }, []);

  const updateStatuses = useCallback((statuses: TicketStatus[]) => {
    setFilters(prev => ({
      ...prev,
      status: statuses.length > 0 ? statuses : undefined,
    }));
  }, []);

  const updateSort = useCallback((option: SortOption) => {
    setSortOption(option);
    switch (option) {
      case 'newest':
        setFilters(prev => ({ ...prev, sortBy: 'issuedAt', sortOrder: 'desc' }));
        break;
      case 'deadline':
        // Sort by issuedAt ascending (closest deadline first)
        setFilters(prev => ({ ...prev, sortBy: 'issuedAt', sortOrder: 'asc' }));
        break;
      case 'amount':
        setFilters(prev => ({ ...prev, sortBy: 'initialAmount', sortOrder: 'desc' }));
        break;
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setStatusCategory('all');
    setSortOption('newest');
    setFilters({
      sortBy: 'issuedAt',
      sortOrder: 'desc',
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    setFilters(prev => ({
      ...prev,
      search: undefined,
    }));
  }, []);

  // Calculate active filter count (excluding sort and search)
  const activeFilterCount = useCallback(() => {
    let count = 0;
    if (statusCategory !== 'all') count++;
    if (filters.issuers && filters.issuers.length > 0) count += filters.issuers.length;
    return count;
  }, [statusCategory, filters.issuers]);

  return {
    filters,
    search,
    statusCategory,
    sortOption,
    updateSearch,
    updateIssuers,
    updateStatuses,
    updateStatusCategory,
    updateSort,
    clearAllFilters,
    clearSearch,
    activeFilterCount: activeFilterCount(),
  };
};
