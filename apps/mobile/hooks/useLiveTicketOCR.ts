import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Camera as CameraType } from 'react-native-vision-camera';

import {
  extractTicketFields,
  type ExtractedTicketFields,
} from '@/utils/extractTicketFields';

type Options = {
  cameraRef: RefObject<CameraType | null>;
  isActive: boolean;
  // Bumps from 0 → >0 when the polygon has held still long enough to consider
  // the user as actively framing. We treat the 0 → >0 transition as the trigger.
  stabilityProgress: number;
};

type LiveOCRState = ExtractedTicketFields & {
  isRecognizing: boolean;
  // Stable getter for the last raw OCR text. Exposed via ref instead of state
  // so it never triggers re-renders — only consumed at capture time when we
  // POST to /api/ocr/upload-image with `ocrText` as a hint.
  getLastOCRText: () => string | null;
};

const THROTTLE_MS = 1500;
// Simulated OCR latency in dev to show the loader spin before the chips
// populate. ML Kit on a real device returns in ~200ms.
const MOCK_OCR_DELAY_MS = 600;

// Mocked OCR text used in __DEV__ while we don't have a working on-device OCR
// library on Apple-Silicon iOS simulators. The text is parsed by the same
// extractTicketFields() that production uses, so the chip flow is exercised
// end-to-end with realistic-looking values.
//
// On a real device we'll swap this for the actual ML Kit recognize() call
// (or whichever OCR lib ends up shipping a proper Apple-Silicon-simulator
// xcframework). Until then: simulator users see canned data; production
// release builds simply skip live OCR — server-side OpenAI Vision at capture
// time remains the source of truth either way.
const MOCK_OCR_TEXT = `Penalty Charge Notice
PCN No: ZY12501745
Vehicle Registration: LV72 EPC
Issued by London Borough of Lewisham
Date: 03-09-2025
Location: Torridon Road junction with Antioch Road
Amount: £130.00`;

const useLiveTicketOCR = ({
  cameraRef,
  isActive,
  stabilityProgress,
}: Options): LiveOCRState => {
  const [fields, setFields] = useState<ExtractedTicketFields>({});
  const [isRecognizing, setIsRecognizing] = useState(false);
  const lastFireRef = useRef(0);
  const inFlightRef = useRef(false);
  const prevStabilityRef = useRef(0);
  const lastTextRef = useRef<string | null>(null);

  // Clear when camera goes inactive (e.g. after capture, when PostCapture mounts).
  useEffect(() => {
    if (!isActive) {
      setFields({});
      setIsRecognizing(false);
      lastFireRef.current = 0;
      lastTextRef.current = null;
    }
  }, [isActive]);

  useEffect(() => {
    const prev = prevStabilityRef.current;
    prevStabilityRef.current = stabilityProgress;

    // Trigger on the 0 → >0 transition. Subsequent ticks while stable don't re-fire;
    // the user must lose then regain stability for another OCR pass.
    if (!(prev === 0 && stabilityProgress > 0)) return;
    if (!isActive || !cameraRef.current) return;
    if (inFlightRef.current) return;

    const now = Date.now();
    if (now - lastFireRef.current < THROTTLE_MS) return;
    lastFireRef.current = now;

    const run = async () => {
      inFlightRef.current = true;
      setIsRecognizing(true);
      try {
        // TODO: replace this with a real on-device OCR call once we have a
        // text-recognition library that ships an Apple-Silicon iOS-simulator
        // xcframework. GoogleMLKit/MLKitTextRecognition 8.x ships only
        // iOS-device + iOS-x86_64-simulator slices, which makes the app
        // unbuildable for arm64 simulators (iOS 26+ are arm64-only).
        if (__DEV__) {
          await new Promise<void>((r) => setTimeout(r, MOCK_OCR_DELAY_MS));
          lastTextRef.current = MOCK_OCR_TEXT;
          setFields(extractTicketFields(MOCK_OCR_TEXT));
        } else {
          // Production: no on-device OCR available. The server-side OCR
          // endpoint runs OpenAI Vision at capture time and remains the
          // source of truth, so we just leave the chips empty here.
          lastTextRef.current = null;
        }
      } catch {
        // Live OCR is best-effort. Silently drop failures so a transient
        // hiccup doesn't disturb the scanning UX.
      } finally {
        inFlightRef.current = false;
        setIsRecognizing(false);
      }
    };

    run();
  }, [stabilityProgress, isActive, cameraRef]);

  return {
    ...fields,
    isRecognizing,
    getLastOCRText: () => lastTextRef.current,
  };
};

export default useLiveTicketOCR;
