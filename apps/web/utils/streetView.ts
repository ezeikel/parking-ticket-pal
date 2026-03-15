/**
 * Google Street View Static API utility.
 *
 * Fetches street-level imagery for a given location from 4 cardinal directions.
 * Checks metadata endpoint first to confirm coverage exists.
 */

const HEADINGS = [0, 90, 180, 270] as const;
const IMAGE_SIZE = '640x640';
const FOV = 90;
const PITCH = 0;

type StreetViewImage = {
  url: string;
  heading: number;
  buffer: Buffer;
  contentType: string;
};

/**
 * Check if Street View coverage exists at the given coordinates.
 */
async function hasStreetViewCoverage(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<boolean> {
  const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`;

  const response = await fetch(metadataUrl);
  if (!response.ok) return false;

  const data = await response.json();
  return data.status === 'OK';
}

/**
 * Fetch street view images from 4 cardinal directions.
 *
 * Returns an array of image buffers with their headings.
 * Returns empty array if no coverage exists.
 */
export default async function fetchStreetViewImages(
  lat: number,
  lng: number,
): Promise<StreetViewImage[]> {
  const apiKey = process.env.GOOGLE_STREET_VIEW_API_KEY;
  if (!apiKey) return [];

  const hasCoverage = await hasStreetViewCoverage(lat, lng, apiKey);
  if (!hasCoverage) return [];

  const images: StreetViewImage[] = [];

  await Promise.all(
    HEADINGS.map(async (heading) => {
      const url = `https://maps.googleapis.com/maps/api/streetview?size=${IMAGE_SIZE}&location=${lat},${lng}&heading=${heading}&fov=${FOV}&pitch=${PITCH}&key=${apiKey}`;

      try {
        const response = await fetch(url);
        if (!response.ok) return;

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType =
          response.headers.get('content-type') || 'image/jpeg';

        images.push({ url, heading, buffer, contentType });
      } catch {
        // Skip failed direction
      }
    }),
  );

  return images.sort((a, b) => a.heading - b.heading);
}
