export const REGION_SLUGS = [
  'london',
  'south-east',
  'south-west',
  'east-of-england',
  'east-midlands',
  'west-midlands',
  'north-west',
  'north-east',
  'yorkshire-and-the-humber',
] as const;

export type RegionSlug = (typeof REGION_SLUGS)[number];

export type Region = {
  slug: RegionSlug;
  name: string;
  description: string;
};
