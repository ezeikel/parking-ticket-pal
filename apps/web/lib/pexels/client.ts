/**
 * Pexels API client for fetching stock photos
 *
 * Used for blog featured images with Gemini Imagen as fallback
 */

// Types
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export interface SearchOptions {
  page?: number;
  per_page?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  color?: string;
  locale?: string;
}

export interface FetchPhotoResult {
  photo: PexelsPhoto | null;
  searchTerm: string;
  error?: string;
}

// Constants
const PEXELS_API_BASE = 'https://api.pexels.com/v1';
const DEFAULT_PER_PAGE = 15;
const TOP_RESULTS_POOL = 5; // Pick randomly from top 5 results

/**
 * Get the Pexels API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Search for photos on Pexels
 */
export async function searchPhotos(
  query: string,
  options: SearchOptions = {},
): Promise<PexelsSearchResponse> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    query,
    page: String(options.page ?? 1),
    per_page: String(options.per_page ?? DEFAULT_PER_PAGE),
  });

  if (options.orientation) {
    params.set('orientation', options.orientation);
  }
  if (options.size) {
    params.set('size', options.size);
  }
  if (options.color) {
    params.set('color', options.color);
  }
  if (options.locale) {
    params.set('locale', options.locale);
  }

  const response = await fetch(`${PEXELS_API_BASE}/search?${params}`, {
    headers: {
      Authorization: apiKey,
    },
    next: {
      revalidate: 3600, // Cache for 1 hour
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a specific photo by ID
 */
export async function getPhoto(id: number): Promise<PexelsPhoto> {
  const apiKey = getApiKey();

  const response = await fetch(`${PEXELS_API_BASE}/photos/${id}`, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get curated photos (editorial picks)
 */
export async function getCuratedPhotos(
  options: Pick<SearchOptions, 'page' | 'per_page'> = {},
): Promise<PexelsSearchResponse> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    per_page: String(options.per_page ?? DEFAULT_PER_PAGE),
  });

  const response = await fetch(`${PEXELS_API_BASE}/curated?${params}`, {
    headers: {
      Authorization: apiKey,
    },
    next: {
      revalidate: 3600,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Select a random photo from the top results
 * This adds variety while still using high-quality, relevant images
 */
export function selectPhotoFromResults(
  photos: PexelsPhoto[],
  poolSize: number = TOP_RESULTS_POOL,
): PexelsPhoto | null {
  if (photos.length === 0) {
    return null;
  }

  // Take the top N results
  const pool = photos.slice(0, Math.min(poolSize, photos.length));

  // Pick a random one from the pool
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Fetch a blog photo using multiple search terms as fallback
 *
 * Tries each search term in order until a suitable photo is found
 *
 * @param searchTerms - Array of search terms to try, in order of preference
 * @param options - Search options
 * @returns The selected photo and which search term worked, or null if none found
 */
export async function fetchBlogPhoto(
  searchTerms: string[],
  options: SearchOptions = { orientation: 'landscape', size: 'large' },
): Promise<FetchPhotoResult> {
  for (const term of searchTerms) {
    try {
      const response = await searchPhotos(term, options);

      if (response.photos.length > 0) {
        const photo = selectPhotoFromResults(response.photos);
        if (photo) {
          return {
            photo,
            searchTerm: term,
          };
        }
      }
    } catch (error) {
      console.error(`Error searching Pexels for "${term}":`, error);
      // Continue to next search term
    }
  }

  return {
    photo: null,
    searchTerm: searchTerms[0] || '',
    error: 'No suitable photos found for any search term',
  };
}

export interface FetchBlogPhotosResult {
  photos: Array<{
    photo: PexelsPhoto;
    searchTerm: string;
  }>;
  error?: string;
}

/**
 * Fetch multiple blog photos for AI evaluation
 *
 * Returns top photos from multiple search terms for AI to evaluate
 * and select the most relevant one.
 *
 * @param searchTerms - Array of search terms to try
 * @param options - Search options including maxPhotos and excludeIds for deduplication
 * @returns Array of photos with their search terms
 */
export async function fetchBlogPhotosForEvaluation(
  searchTerms: string[],
  options: SearchOptions & {
    maxPhotos?: number;
    excludeIds?: string[];
  } = { orientation: 'landscape', size: 'large' },
): Promise<FetchBlogPhotosResult> {
  const { maxPhotos = 5, excludeIds = [], ...searchOptions } = options;
  const excludeSet = new Set(excludeIds);
  const results: Array<{ photo: PexelsPhoto; searchTerm: string }> = [];

  for (const term of searchTerms) {
    if (results.length >= maxPhotos) break;

    try {
      const response = await searchPhotos(term, searchOptions);

      // Filter out already-used photos, then take top results
      const availablePhotos = response.photos.filter(
        (photo) => !excludeSet.has(String(photo.id)),
      );
      const remaining = maxPhotos - results.length;
      const topPhotos = availablePhotos.slice(0, Math.min(3, remaining));

      for (const photo of topPhotos) {
        results.push({ photo, searchTerm: term });
        if (results.length >= maxPhotos) break;
      }
    } catch (error) {
      console.error(`Error searching Pexels for "${term}":`, error);
      // Continue to next search term
    }
  }

  if (results.length === 0) {
    return {
      photos: [],
      error: 'No photos found for any search term',
    };
  }

  return { photos: results };
}

/**
 * Download a photo and return it as a buffer
 * Useful for uploading to Sanity
 */
export async function downloadPhoto(
  photo: PexelsPhoto,
  size: keyof PexelsPhoto['src'] = 'large2x',
): Promise<Buffer> {
  const url = photo.src[size];

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download photo: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Format photo credit for attribution
 */
export function formatPhotoCredit(photo: PexelsPhoto): {
  credit: string;
  creditUrl: string;
} {
  return {
    credit: `Photo by ${photo.photographer} on Pexels`,
    creditUrl: photo.photographer_url,
  };
}
