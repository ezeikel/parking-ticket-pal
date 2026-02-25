import { LOCAL_AUTHORITY_IDS } from '@/constants';
import type { Region, RegionSlug } from './types';
import { REGIONS, COUNCIL_REGION_MAP } from './regions';

export { REGIONS, COUNCIL_REGION_MAP } from './regions';
export { REGION_SLUGS } from './types';
export type { Region, RegionSlug } from './types';

export function getAllRegions(): Region[] {
  return REGIONS;
}

export function getRegionBySlug(slug: string): Region | undefined {
  return REGIONS.find((r) => r.slug === slug);
}

export function getCouncilsByRegion(regionSlug: RegionSlug): string[] {
  return LOCAL_AUTHORITY_IDS.filter(
    (id) => COUNCIL_REGION_MAP[id] === regionSlug,
  );
}

export function getRegionForCouncil(councilId: string): RegionSlug | undefined {
  return COUNCIL_REGION_MAP[councilId];
}

export function getAllRegionSlugs(): RegionSlug[] {
  return REGIONS.map((r) => r.slug);
}
