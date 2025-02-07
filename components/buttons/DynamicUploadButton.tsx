'use client';

import dynamic from 'next/dynamic';

const UploadButton = dynamic(
  () => import('@/components/buttons/UploadButton/UploadButton'),
  {
    ssr: false,
  },
);

export default function DynamicUploadButton() {
  return <UploadButton />;
}
