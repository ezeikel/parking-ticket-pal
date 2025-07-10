'use client';

import type React from 'react';

import { type ElementRef, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const dialogRef = useRef<ElementRef<'dialog'>>(null);

  useEffect(() => {
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, []);

  function onDismiss() {
    router.back();
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-50">
      <dialog
        ref={dialogRef}
        className="fixed inset-0 z-50 m-auto w-full max-w-lg h-fit rounded-lg border bg-background p-0 shadow-lg"
        onClose={onDismiss}
      >
        <div className="relative p-6">
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </dialog>
    </div>,
    document.getElementById('modal-root')!,
  );
};

export default Modal;
