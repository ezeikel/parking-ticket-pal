'use client';

import dynamic from 'next/dynamic';

const DashboardTicketsMap = dynamic(
  () => import('@/components/dashboard/DashboardTicketsMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-2xl bg-muted" />
    ),
  },
);

export default DashboardTicketsMap;
