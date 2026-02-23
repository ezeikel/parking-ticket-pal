'use client';

import dynamic from 'next/dynamic';

const LocationMap = dynamic(
  () => import('@/components/LocationMap/LocationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
    ),
  },
);

export default LocationMap;
