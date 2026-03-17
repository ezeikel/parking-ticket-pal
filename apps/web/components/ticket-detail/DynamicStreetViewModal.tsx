'use client';

import dynamic from 'next/dynamic';

const DynamicStreetViewModal = dynamic(
  () => import('@/components/ticket-detail/StreetViewModal'),
  {
    ssr: false,
  },
);

export default DynamicStreetViewModal;
