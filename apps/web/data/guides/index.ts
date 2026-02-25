import type { Guide } from './types';
import { GUIDES } from './guides';

export { GUIDES } from './guides';
export type { Guide, GuideSection, GuideFaq, HowToStep } from './types';

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}

export function getAllGuides(): Guide[] {
  return GUIDES;
}
