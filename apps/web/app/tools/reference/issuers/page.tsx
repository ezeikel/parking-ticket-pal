'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSearch,
  faBuilding,
  faTrain,
  faLock,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANIES,
  TRANSPORT_AUTHORITIES,
  LOCAL_AUTHORITIES,
} from '@/constants';

type IssuerTypeFilter = 'all' | 'council' | 'private' | 'tfl';

// Helper to convert slug to display name
const slugToDisplayName = (slug: string): string => {
  // Check if we have a full metadata entry
  const fullEntry = LOCAL_AUTHORITIES.find((la) => la.id === slug);
  if (fullEntry) return fullEntry.name;

  // Otherwise, convert the slug
  return slug
    .split('-')
    .map((word) => {
      // Handle special cases
      if (word === 'and') return 'and';
      if (word === 'of') return 'of';
      if (word === 'upon') return 'upon';
      if (word === 'in') return 'in';
      if (word === 'the') return 'the';
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Get all issuers in a structured format
const getAllIssuers = () => {
  const councils = LOCAL_AUTHORITY_IDS.map((id) => ({
    id,
    name: slugToDisplayName(id),
    type: 'council' as const,
  }));

  const privateCompanies = PRIVATE_COMPANIES.map((company) => ({
    id: company.id,
    name: company.name,
    type: 'private' as const,
  }));

  const transportAuth = TRANSPORT_AUTHORITIES.map((ta) => ({
    id: ta.id,
    name: ta.name,
    type: 'tfl' as const,
  }));

  return [...councils, ...privateCompanies, ...transportAuth].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};

const issuerTypeConfig: Record<
  'council' | 'private' | 'tfl',
  { label: string; icon: typeof faBuilding; color: string }
> = {
  council: { label: 'Local Council', icon: faBuilding, color: 'text-teal' },
  private: { label: 'Private Company', icon: faLock, color: 'text-coral' },
  tfl: { label: 'Transport Authority', icon: faTrain, color: 'text-amber' },
};

export default function IssuersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<IssuerTypeFilter>('all');

  const allIssuers = useMemo(() => getAllIssuers(), []);

  const filteredIssuers = useMemo(() => {
    return allIssuers.filter((issuer) => {
      // Search filter
      if (
        searchQuery &&
        !issuer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !issuer.id.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && issuer.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [allIssuers, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: allIssuers.length,
      councils: allIssuers.filter((i) => i.type === 'council').length,
      private: allIssuers.filter((i) => i.type === 'private').length,
      tfl: allIssuers.filter((i) => i.type === 'tfl').length,
    };
  }, [allIssuers]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Tools
            </Link>
          </div>

          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white">
              <FontAwesomeIcon icon={faBuilding} className="text-2xl text-dark" />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              UK Parking Ticket Issuers
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Find information about {stats.total} councils, private parking companies,
              and transport authorities that issue parking tickets in the UK.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <div className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold text-dark">{stats.councils}</span>
              <span className="ml-1 text-gray">Local Councils</span>
            </div>
            <div className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold text-dark">{stats.private}</span>
              <span className="ml-1 text-gray">Private Companies</span>
            </div>
            <div className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold text-dark">{stats.tfl}</span>
              <span className="ml-1 text-gray">Transport Authorities</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="border-b border-border bg-white py-6">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 md:max-w-md">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray"
              />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-dark/20 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as IssuerTypeFilter)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-dark/20 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="council">Local Councils</option>
              <option value="private">Private Companies</option>
              <option value="tfl">Transport Authorities</option>
            </select>
          </div>

          {/* Results count */}
          <p className="mt-4 text-sm text-gray">
            Showing {filteredIssuers.length} of {stats.total} issuers
          </p>
        </div>
      </section>

      {/* Issuers List */}
      <section className="bg-white py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          {filteredIssuers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray">No issuers found matching your search.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredIssuers.map((issuer) => {
                const config = issuerTypeConfig[issuer.type];

                return (
                  <Link
                    key={issuer.id}
                    href={`/tools/reference/issuers/${issuer.id}`}
                    className="group flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:border-dark/20"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-light">
                      <FontAwesomeIcon
                        icon={config.icon}
                        className={`text-sm ${config.color}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark truncate group-hover:text-teal">
                        {issuer.name}
                      </p>
                      <p className="text-xs text-gray">{config.label}</p>
                    </div>
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-xs text-gray opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <h2 className="text-xl font-bold text-white md:text-2xl">
            Got a Parking Ticket?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray">
            Upload your PCN and our AI will write a personalised appeal letter
            tailored to your specific issuer and circumstances.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Upload Your Ticket
          </Link>
        </div>
      </section>
    </div>
  );
}
