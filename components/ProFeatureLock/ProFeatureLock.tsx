'use client';

import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/pro-solid-svg-icons';
import type { ReactNode } from 'react';

type ProFeatureLockProps = {
  children: ReactNode;
};

const ProFeatureLock = ({ children }: ProFeatureLockProps) => (
  <div className="relative">
    <div className="blur-[2px] pointer-events-none">{children}</div>
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/60">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-background p-8 shadow-xl">
        <FontAwesomeIcon icon={faLock} className="h-8 w-8 text-primary" />
        <div className="text-center">
          <h3 className="text-xl font-bold">Unlock with PRO</h3>
          <p className="text-muted-foreground">This is a PRO feature.</p>
        </div>
        <Button>Upgrade to PRO</Button>
      </div>
    </div>
  </div>
);

export default ProFeatureLock;
