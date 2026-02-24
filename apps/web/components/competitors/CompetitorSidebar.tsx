import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFileLines } from '@fortawesome/pro-solid-svg-icons';
import type { Competitor } from '@/data/competitors/types';
import { competitors } from '@/data/competitors';

type CompetitorSidebarProps = {
  current: Competitor;
  variant: 'compare' | 'alternative';
};

const CompetitorSidebar = ({ current, variant }: CompetitorSidebarProps) => {
  const others = competitors.filter((c) => c.id !== current.id);

  return (
    <div className="space-y-6">
      {/* CTA Card */}
      <div className="rounded-xl bg-dark p-6 text-white">
        <h3 className="text-lg font-bold">Got a parking ticket?</h3>
        <p className="mt-2 text-sm text-white/80">
          Upload your ticket and our AI will write a personalised appeal letter
          using winning arguments from real tribunal decisions.
        </p>
        <Link
          href="/"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          Upload Your Ticket
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>

      {/* Other Comparisons/Alternatives */}
      <div className="rounded-xl border border-border p-6">
        <h3 className="font-bold text-dark">
          {variant === 'compare' ? 'Other Comparisons' : 'Other Alternatives'}
        </h3>
        <div className="mt-4 space-y-2">
          {others.map((competitor) => (
            <Link
              key={competitor.id}
              href={
                variant === 'compare'
                  ? `/compare/${competitor.compareSlug}`
                  : `/alternatives/${competitor.alternativeSlug}`
              }
              className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm transition-colors hover:bg-light"
            >
              <span className="truncate text-gray">
                {variant === 'compare'
                  ? `PTP vs ${competitor.shortName}`
                  : `${competitor.shortName} Alternatives`}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Free Tools Link */}
      <div className="rounded-xl border border-border p-6">
        <h3 className="flex items-center gap-2 font-bold text-dark">
          <FontAwesomeIcon icon={faFileLines} className="text-gray" />
          Free Appeal Tools
        </h3>
        <p className="mt-2 text-sm text-gray">
          Browse our free letter templates, contravention code database, and
          vehicle tools.
        </p>
        <Link
          href="/tools"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
        >
          Browse free tools
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>

      {/* Cross-link */}
      <div className="rounded-xl border border-border p-6">
        <h3 className="font-bold text-dark">
          {variant === 'compare'
            ? `${current.shortName} Alternatives`
            : `PTP vs ${current.shortName}`}
        </h3>
        <p className="mt-2 text-sm text-gray">
          {variant === 'compare'
            ? `Looking for alternatives to ${current.name}? See all your options.`
            : `See how Parking Ticket Pal directly compares to ${current.name}.`}
        </p>
        <Link
          href={
            variant === 'compare'
              ? `/alternatives/${current.alternativeSlug}`
              : `/compare/${current.compareSlug}`
          }
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
        >
          {variant === 'compare' ? 'View alternatives' : 'View comparison'}
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>
    </div>
  );
};

export default CompetitorSidebar;
