const APP_STORE_BASE =
  'https://apps.apple.com/us/app/parking-ticket-pal/id6753653055';

const PLAY_STORE_BASE =
  'https://play.google.com/store/apps/details?id=com.chewybytes.parkingticketpal.app';

export const appStoreUrl = (
  utm: { source: string; medium?: string; campaign?: string } = {
    source: 'website',
  },
) => {
  const params = new URLSearchParams({
    utm_source: utm.source,
    utm_medium: utm.medium ?? 'web',
    utm_campaign: utm.campaign ?? 'website',
  });
  // Apple uses campaign tokens via pt/ct params, but UTMs still work for
  // analytics on the landing page redirect. Keep it simple.
  return `${APP_STORE_BASE}?${params.toString()}`;
};

const CHROME_WEB_STORE_BASE =
  'https://chromewebstore.google.com/detail/parking-ticket-pal/nohfojcmpnedhbfohmdibcipappacjeh';

export const chromeWebStoreUrl = (
  utm: { source: string; medium?: string; campaign?: string } = {
    source: 'website',
  },
) => {
  const params = new URLSearchParams({
    utm_source: utm.source,
    utm_medium: utm.medium ?? 'web',
    utm_campaign: utm.campaign ?? 'website',
  });
  return `${CHROME_WEB_STORE_BASE}?${params.toString()}`;
};

export const playStoreUrl = (
  utm: { source: string; medium?: string; campaign?: string } = {
    source: 'website',
  },
) => {
  const params = new URLSearchParams({
    utm_source: utm.source,
    utm_medium: utm.medium ?? 'web',
    utm_campaign: utm.campaign ?? 'website',
  });
  return `${PLAY_STORE_BASE}&${params.toString()}`;
};
