import { useState, useCallback } from 'react';
import type { TicketFilters } from '../api';
import { TicketStatus, IssuerType, TicketType } from '../types';

export type SortOption = {
  value: TicketFilters['sortBy'];
  label: string;
};

export const SORT_OPTIONS: SortOption[] = [
  { value: 'issuedAt', label: 'Date Issued' },
  { value: 'initialAmount', label: 'Amount' },
  { value: 'createdAt', label: 'Recently Added' },
  { value: 'status', label: 'Status' },
  { value: 'issuer', label: 'Issuer' },
];

export const useTicketFilters = () => {
  const [filters, setFilters] = useState<TicketFilters>({
    sortBy: 'issuedAt',
    sortOrder: 'desc',
  });

  const [search, setSearch] = useState('');

  const updateSearch = useCallback((value: string) => {
    setSearch(value);
    setFilters(prev => ({
      ...prev,
      search: value || undefined,
    }));
  }, []);

  const updateStatus = useCallback((statuses: string[]) => {
    setFilters(prev => ({
      ...prev,
      status: statuses.length > 0 ? statuses as TicketStatus[] : undefined,
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

  const updateIssuerType = useCallback((types: IssuerType[]) => {
    setFilters(prev => ({
      ...prev,
      issuerType: types.length > 0 ? types : undefined,
    }));
  }, []);

  const updateTicketType = useCallback((types: TicketType[]) => {
    setFilters(prev => ({
      ...prev,
      ticketType: types.length > 0 ? types : undefined,
    }));
  }, []);

  const updateDateRange = useCallback((dateFrom?: string, dateTo?: string) => {
    setFilters(prev => ({
      ...prev,
      dateFrom,
      dateTo,
    }));
  }, []);

  const updateAmountRange = useCallback((amountMin?: number, amountMax?: number) => {
    setFilters(prev => ({
      ...prev,
      amountMin,
      amountMax,
    }));
  }, []);

  const updateVerified = useCallback((verified?: boolean) => {
    setFilters(prev => ({
      ...prev,
      verified,
    }));
  }, []);

  const updateSort = useCallback((sortBy: TicketFilters['sortBy'], sortOrder: 'asc' | 'desc' = 'asc') => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder,
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch('');
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
    if (filters.issuers && filters.issuers.length > 0) count += filters.issuers.length;
    if (filters.status && filters.status.length > 0) count += filters.status.length;
    if (filters.issuerType && filters.issuerType.length > 0) count++;
    if (filters.ticketType && filters.ticketType.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) count++;
    if (filters.verified !== undefined) count++;
    return count;
  }, [filters]);

  return {
    filters,
    search,
    updateSearch,
    updateIssuers,
    updateStatuses,
    updateStatus,
    updateIssuerType,
    updateTicketType,
    updateDateRange,
    updateAmountRange,
    updateVerified,
    updateSort,
    clearAllFilters,
    clearSearch,
    activeFilterCount: activeFilterCount(),
  };
};
