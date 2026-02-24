import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/pro-solid-svg-icons';
import type { Competitor } from '@/data/competitors/types';

type CompetitorCardProps = {
  competitor: Competitor;
  variant: 'compare' | 'alternative';
};

const categoryLabels: Record<string, string> = {
  app: 'App',
  professional: 'Professional',
  diy: 'DIY',
  inaction: 'Option',
  charity: 'Free Service',
};

const CompetitorCard = ({ competitor, variant }: CompetitorCardProps) => {
  const href =
    variant === 'compare'
      ? `/compare/${competitor.compareSlug}`
      : `/alternatives/${competitor.alternativeSlug}`;

  const title =
    variant === 'compare'
      ? `PTP vs ${competitor.shortName}`
      : `${competitor.shortName} Alternatives`;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-border bg-white p-6 transition-all hover:border-dark/20 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-gray">
          {categoryLabels[competitor.category]}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-dark">{title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-gray">
        {competitor.description}
      </p>

      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal transition-colors group-hover:text-teal-dark">
        Read comparison
        <FontAwesomeIcon
          icon={faArrowRight}
          className="text-xs transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
};

export default CompetitorCard;
