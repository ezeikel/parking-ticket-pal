'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faArrowLeft,
  faSearch,
  faRoad,
  faSquareParking,
  faCar,
  faCircleInfo,
} from '@fortawesome/pro-solid-svg-icons';
import {
  CONTRAVENTION_CODES,
  SUFFIX_DEFINITIONS,
  type CodeCategory,
  type PenaltyLevel,
} from '@parking-ticket-pal/constants';

type FilterCategory = 'all' | CodeCategory;
type FilterLevel = 'all' | PenaltyLevel;

const categoryLabels: Record<CodeCategory, string> = {
  'on-street': 'On-Street',
  'off-street': 'Off-Street',
  'moving-traffic': 'Moving Traffic',
};

const categoryIcons: Record<CodeCategory, typeof faRoad> = {
  'on-street': faRoad,
  'off-street': faSquareParking,
  'moving-traffic': faCar,
};

const penaltyLabels: Record<PenaltyLevel, string> = {
  higher: 'Higher',
  lower: 'Lower',
  'n/a': 'N/A',
};

const ContraventionCodesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [penaltyFilter, setPenaltyFilter] = useState<FilterLevel>('all');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const codes = useMemo(() => {
    return Object.values(CONTRAVENTION_CODES)
      .filter((code) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesCode = code.code.toLowerCase().includes(query);
          const matchesDescription = code.description.toLowerCase().includes(query);
          if (!matchesCode && !matchesDescription) return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && code.category !== categoryFilter) {
          return false;
        }

        // Penalty level filter
        if (penaltyFilter !== 'all' && code.penaltyLevel !== penaltyFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [searchQuery, categoryFilter, penaltyFilter]);

  const stats = useMemo(() => {
    const allCodes = Object.values(CONTRAVENTION_CODES);
    return {
      total: allCodes.length,
      onStreet: allCodes.filter((c) => c.category === 'on-street').length,
      offStreet: allCodes.filter((c) => c.category === 'off-street').length,
      movingTraffic: allCodes.filter((c) => c.category === 'moving-traffic').length,
    };
  }, []);

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
              <FontAwesomeIcon icon={faBook} className="text-2xl text-dark" />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              UK Contravention Codes
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Look up what your PCN contravention code means. Covers {stats.total} codes
              for on-street parking, off-street car parks, and moving traffic offences.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <div className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold text-dark">{stats.onStreet}</span>
              <span className="ml-1 text-gray">On-Street</span>
            </div>
            <div className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold text-dark">{stats.offStreet}</span>
              <span className="ml-1 text-gray">Off-Street</span>
            </div>
            <div className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold text-dark">{stats.movingTraffic}</span>
              <span className="ml-1 text-gray">Moving Traffic</span>
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
                placeholder="Search by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-dark/20 focus:outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as FilterCategory)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-dark/20 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="on-street">On-Street</option>
                <option value="off-street">Off-Street</option>
                <option value="moving-traffic">Moving Traffic</option>
              </select>

              <select
                value={penaltyFilter}
                onChange={(e) => setPenaltyFilter(e.target.value as FilterLevel)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-dark/20 focus:outline-none"
              >
                <option value="all">All Penalty Levels</option>
                <option value="higher">Higher Level</option>
                <option value="lower">Lower Level</option>
                <option value="n/a">N/A (Moving Traffic)</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <p className="mt-4 text-sm text-gray">
            Showing {codes.length} of {stats.total} codes
          </p>
        </div>
      </section>

      {/* Codes List */}
      <section className="bg-white py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          {codes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray">No codes found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((code) => (
                <motion.div
                  key={code.code}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-border bg-white transition-colors hover:border-dark/20"
                >
                  <div className="flex w-full items-start gap-4 p-4 text-left">
                    {/* Code badge */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-light">
                      <span className="text-lg font-bold text-dark">{code.code}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <p className="font-medium text-dark">{code.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Category badge */}
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-gray">
                          <FontAwesomeIcon
                            icon={categoryIcons[code.category]}
                            className="text-[10px]"
                          />
                          {categoryLabels[code.category]}
                        </span>

                        {/* Penalty level badge */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            code.penaltyLevel === 'higher'
                              ? 'bg-coral/10 text-coral'
                              : code.penaltyLevel === 'lower'
                                ? 'bg-amber/10 text-amber'
                                : 'bg-gray/10 text-gray'
                          }`}
                        >
                          {penaltyLabels[code.penaltyLevel]} penalty
                        </span>

                        {/* Suffixes count */}
                        {code.suffixes.length > 0 && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-gray">
                            {code.suffixes.length} suffix
                            {code.suffixes.length > 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* View details link */}
                    <Link
                      href={`/tools/reference/contravention-codes/${code.code}`}
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-dark transition-colors hover:bg-light"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View details
                    </Link>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() =>
                      setExpandedCode(expandedCode === code.code ? null : code.code)
                    }
                    className="w-full border-t border-border px-4 py-2 text-xs text-gray hover:bg-light"
                  >
                    {expandedCode === code.code ? 'Hide suffixes' : 'Show suffixes'}
                  </button>

                  {/* Expanded content */}
                  {expandedCode === code.code && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border px-4 pb-4"
                    >
                      <div className="pt-4">
                        {/* Notes */}
                        {code.notes && (
                          <div className="mb-4 flex items-start gap-2 rounded-lg bg-light p-3">
                            <FontAwesomeIcon
                              icon={faCircleInfo}
                              className="mt-0.5 text-sm text-gray"
                            />
                            <p className="text-sm text-gray">{code.notes}</p>
                          </div>
                        )}

                        {/* Suffixes */}
                        {code.suffixes.length > 0 && (
                          <div>
                            <p className="mb-2 text-sm font-medium text-dark">
                              Valid suffixes for this code:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {code.suffixes.map((suffix) => (
                                <span
                                  key={suffix}
                                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
                                  title={SUFFIX_DEFINITIONS[suffix] || suffix}
                                >
                                  <span className="font-mono font-bold text-dark">
                                    {code.code}
                                    {suffix}
                                  </span>
                                  <span className="text-gray">
                                    {SUFFIX_DEFINITIONS[suffix] || suffix}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <h2 className="text-xl font-bold text-white md:text-2xl">
            Challenging This Code?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray">
            Upload your PCN and our AI will write a personalised appeal letter based on
            real tribunal wins for your specific contravention code.
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
};

export default ContraventionCodesPage;
