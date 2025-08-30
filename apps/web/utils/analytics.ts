/**
 * Utility for cleaning analytics properties for Vercel Analytics.
 *
 * Vercel Analytics only accepts string, number, boolean, or null values.
 * This utility filters and converts properties to match Vercel's requirements.
 *
 * Used by both client and server analytics utilities.
 */

type VercelProperties = Record<string, string | number | boolean | null>;

// eslint-disable-next-line import/prefer-default-export
export const cleanVercelProperties = (
  properties: Record<string, any>,
): VercelProperties =>
  Object.keys(properties).reduce<VercelProperties>((cleaned, key) => {
    const value = properties[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      return { ...cleaned, [key]: value };
    }
    if (value !== undefined) {
      return { ...cleaned, [key]: String(value) };
    }
    return cleaned;
  }, {});
