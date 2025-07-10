'use client';

import dynamic from 'next/dynamic';

const UploadButton = dynamic(
  () => import('@/components/buttons/UploadButton/UploadButton'),
  {
    ssr: false,
  },
);

const DynamicUploadButton = () => <UploadButton />;

export default DynamicUploadButton;
