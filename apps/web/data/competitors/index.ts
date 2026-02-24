import type { Competitor } from './types';
import { competitors } from './competitors';

export * from './types';
export { competitors } from './competitors';

export const getCompetitorById = (id: string): Competitor | undefined =>
  competitors.find((c) => c.id === id);

export const getCompetitorByCompareSlug = (
  slug: string,
): Competitor | undefined => competitors.find((c) => c.compareSlug === slug);

export const getCompetitorByAlternativeSlug = (
  slug: string,
): Competitor | undefined =>
  competitors.find((c) => c.alternativeSlug === slug);

export const getAllCompareSlugs = (): string[] =>
  competitors.map((c) => c.compareSlug);

export const getAllAlternativeSlugs = (): string[] =>
  competitors.map((c) => c.alternativeSlug);
