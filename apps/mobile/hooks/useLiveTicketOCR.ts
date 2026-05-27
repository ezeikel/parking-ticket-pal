import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { NativeModules } from 'react-native';
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

// Mocked OCR text used when the native ML Kit module isn't linked (iOS
// simulator dev builds). The text is parsed by the same extractTicketFields()
// that production uses, so the chip-rendering path is exercised end-to-end on
// the sim.
//
// Why we need a mock: @react-native-ml-kit/text-recognition pulls in
// GoogleMLKit, which ships only iOS-device + iOS-x86_64-simulator slices —
// no arm64-simulator slice — making the whole app unbuildable for
// Apple-Silicon iOS simulators (iOS 26+ are arm64-only). We strip the pod
// from autolinking when EXPO_PUBLIC_ENVIRONMENT === 'development' (see
// react-native.config.js). At runtime we feature-detect by requiring the
// module inside try/catch — if linked, real OCR fires; if not, mock.
const MOCK_OCR_TEXT = `Penalty Charge Notice
PCN No: ZY12501745
Vehicle Registration: LV72 EPC
Issued by London Borough of Lewisham
Date: 03-09-2025
Location: Torridon Road junction with Antioch Road
Amount: £130.00`;

// Lazy, defensive load of the ML Kit text recognizer. Returns null on sim
// dev builds where autolinking has stripped the pod (or any other reason the
// native side isn't available). The require() is wrapped because evaluating
// it at module top-level would throw before the hook even runs.
type RecognizerResult = { text: string };
type Recognizer = {
  recognize: (uri: string) => Promise<RecognizerResult>;
};
const loadRecognizer = (): Recognizer | null => {
  // First check the native side. The npm package's JS shim happily resolves
  // even when its native module isn't linked (dev sim builds), and only
  // throws once .recognize() is called. Probe NativeModules directly so we
  // fall back to the mock without firing a doomed native call.
  if (!NativeModules?.MLKitTextRecognition) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const mod = require('@react-native-ml-kit/text-recognition');
    const candidate: Recognizer | undefined = mod?.default ?? mod;
    if (
      candidate &&
      typeof (candidate as Recognizer).recognize === 'function'
    ) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
};

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
        const recognizer = loadRecognizer();
        if (__DEV__) {
          const g = globalThis as { __scannerDebug?: Record<string, unknown> };
          g.__scannerDebug = {
            ...(g.__scannerDebug ?? {}),
            recognizerLoaded: recognizer !== null,
            recognizerType: typeof recognizer,
            hasCameraRef: !!cameraRef.current,
          };
        }
        if (recognizer && cameraRef.current) {
          // Real on-device OCR path (preview/prod EAS builds on physical
          // devices). Snap a low-quality throwaway photo and pipe its URI
          // into ML Kit. ~200–400 ms total on modern iPhones.
          const photo = await cameraRef.current.takePhoto({
            flash: 'off',
            enableShutterSound: false,
          });
          const uri = photo.path.startsWith('file://')
            ? photo.path
            : `file://${photo.path}`;
          const result = await recognizer.recognize(uri);
          lastTextRef.current = result.text ?? null;
          setFields(extractTicketFields(result.text ?? ''));
        } else if (__DEV__) {
          // Sim dev build — pod stripped via react-native.config.js. Show
          // mock chips so the UI flow can still be exercised on SimCam.
          await new Promise<void>((r) => setTimeout(r, MOCK_OCR_DELAY_MS));
          lastTextRef.current = MOCK_OCR_TEXT;
          setFields(extractTicketFields(MOCK_OCR_TEXT));
        } else {
          // Native module missing in a non-dev build (shouldn't happen, but
          // fail soft rather than break capture). Server OCR at capture time
          // remains the source of truth.
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
