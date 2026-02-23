'use client';

import dynamic from 'next/dynamic';

const DynamicSignatureCanvas = dynamic(
  () => import('@/components/SignatureCanvas/SignatureCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full">
        <div className="h-[200px] animate-pulse rounded-md border border-input bg-muted" />
      </div>
    ),
  },
);

export type { SignatureCanvasHandle } from '@/components/SignatureCanvas/SignatureCanvas';
export default DynamicSignatureCanvas;
