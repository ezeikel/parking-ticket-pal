'use client';

import dynamic from 'next/dynamic';

const AnalyticsCharts = dynamic(
  () => import('@/components/dashboard/AnalyticsCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    ),
  },
);

export default AnalyticsCharts;
