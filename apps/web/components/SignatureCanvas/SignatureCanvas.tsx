'use client';

import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import SignaturePad from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

type SignatureCanvasProps = {
  onSignatureChange: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
  showClearButton?: boolean;
};

// Define handle type for the forwarded ref
export type SignatureCanvasHandle = {
  clear: () => void;
};

const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  (
    {
      onSignatureChange,
      width = 500,
      height = 200,
      className = '',
      showClearButton = true,
    },
    ref,
  ) => {
    const sigCanvas = useRef<SignaturePad>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const [canvasDimensions, setCanvasDimensions] = useState({ width, height });

    // resize handler to maintain correct scale ratio
    const resizeCanvas = () => {
      if (containerRef.current && sigCanvas.current) {
        const containerWidth = containerRef.current.clientWidth;
        // calculate height while maintaining aspect ratio
        const containerHeight = (containerWidth * height) / width;

        setCanvasDimensions({
          width: containerWidth,
          height: containerHeight,
        });

        // ensures the internal canvas coordinates match the display size
        sigCanvas.current.clear();
      }
    };

    // set up resize observer
    useEffect(() => {
      // initialize canvas once on mount
      resizeCanvas();

      // set up ResizeObserver to watch container size changes
      if (containerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          resizeCanvas();
        });

        resizeObserverRef.current.observe(containerRef.current);
      }

      // cleanup on unmount
      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }, []);

    const clear = () => {
      if (sigCanvas.current) {
        sigCanvas.current.clear();
        onSignatureChange(null);
      }
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      clear,
    }));

    // handle end of signature stroke
    const handleEndStroke = () => {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        // Get vector points data
        const pointData = sigCanvas.current.toData();

        // Convert to JSON string for storage/transmission
        const pointDataString = JSON.stringify(pointData);

        // Send only the point data for processing
        onSignatureChange(pointDataString);
      }
    };

    return (
      <div className={`w-full ${className}`}>
        <div className="signature-container">
          <div
            ref={containerRef}
            className="border rounded-md border-input bg-background p-1 relative"
          >
            <SignaturePad
              ref={sigCanvas}
              onEnd={handleEndStroke}
              canvasProps={{
                width: canvasDimensions.width,
                height: canvasDimensions.height,
                className: 'signature-canvas',
                style: {
                  width: '100%',
                  height: '100%',
                },
              }}
            />
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground">
              Sign here
            </p>
          </div>
          {showClearButton && (
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" onClick={clear} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
