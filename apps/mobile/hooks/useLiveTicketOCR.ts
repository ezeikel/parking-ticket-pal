import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { NativeModules, Platform } from 'react-native';
import type { Camera as CameraType } from 'react-native-vision-camera';

import {
  extractTicketFieldCandidates,
  type ExtractedTicketFields,
  type OCRLine,
} from '@/utils/extractTicketFields';
import DocumentDetector from '@/modules/document-detector';

type Options = {
  cameraRef: RefObject<CameraType | null>;
  isActive: boolean;
  // Monotonic counter that increments each time the detector decides a
  // document has been held roughly steady (a loose, handheld-friendly signal).
  // We run one OCR pass each time this value increases.
  triggerCount: number;
};

type LiveOCRState = ExtractedTicketFields & {
  isRecognizing: boolean;
  // Stable getter for the last raw OCR text. Exposed via ref instead of state
  // so it never triggers re-renders — only consumed at capture time when we
  // POST to /api/ocr/upload-image with `ocrText` as a hint.
  getLastOCRText: () => string | null;
  // Stable getter for the latest merged fields. Read at capture time so the
  // chip values aren't lost to a stale callback closure (`fields` is state and
  // changes identity every render, so a memoised handler would otherwise
  // snapshot empty values).
  getFields: () => ExtractedTicketFields;
  // Clear the accumulated fields — call when the document leaves frame so the
  // next ticket starts a fresh read instead of merging onto the previous one.
  reset: () => void;
};

const THROTTLE_MS = 1500;

// Per-field weighted vote tallies (value → accumulated confidence) accumulated
// across the reads of one framing session. reset() empties them between tickets.
type FieldVotes = {
  pcn: Map<string, number>;
  vrm: Map<string, number>;
  issuer: Map<string, number>;
};

const emptyVotes = (): FieldVotes => ({
  pcn: new Map(),
  vrm: new Map(),
  issuer: new Map(),
});

// The value with the most accumulated weight wins (ties resolve to the first
// value that reached the max, i.e. earliest-seen).
const winner = (tally: Map<string, number>): string | undefined => {
  let best: string | undefined;
  let bestWeight = 0;
  for (const [value, weight] of tally) {
    if (weight > bestWeight) {
      bestWeight = weight;
      best = value;
    }
  }
  return best;
};

// Lazy, defensive load of the Google ML Kit text recognizer — the ANDROID OCR
// engine (iOS uses Apple Vision via the document-detector module instead).
// Returns null if the native side isn't available. The require() is wrapped
// because evaluating it at module top-level would throw before the hook runs.
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
  triggerCount,
}: Options): LiveOCRState => {
  const [fields, setFields] = useState<ExtractedTicketFields>({});
  const [isRecognizing, setIsRecognizing] = useState(false);
  const lastFireRef = useRef(0);
  const inFlightRef = useRef(false);
  const prevTriggerRef = useRef(0);
  const lastTextRef = useRef<string | null>(null);
  // Mirror of `fields` for synchronous, stale-closure-proof reads (capture time)
  // and so the winners can be recomputed without depending on React's async state.
  const fieldsRef = useRef<ExtractedTicketFields>({});
  // Cross-read weighted vote tallies for the current framing session.
  const votesRef = useRef<FieldVotes>(emptyVotes());
  // Session generation. Bumped whenever the session is cleared (reset / camera
  // inactive) so an OCR read that was already in flight when that happened is
  // DISCARDED instead of writing the old ticket's values back into the fresh
  // (or post-capture) session.
  const genRef = useRef(0);

  const reset = useCallback(() => {
    genRef.current += 1;
    votesRef.current = emptyVotes();
    fieldsRef.current = {};
    lastTextRef.current = null;
    lastFireRef.current = 0;
    setFields({});
  }, []);

  const getFields = useCallback(() => fieldsRef.current, []);

  // Clear when camera goes inactive (e.g. after capture, when PostCapture mounts).
  useEffect(() => {
    if (!isActive) {
      genRef.current += 1;
      votesRef.current = emptyVotes();
      fieldsRef.current = {};
      setFields({});
      setIsRecognizing(false);
      lastFireRef.current = 0;
      lastTextRef.current = null;
    }
  }, [isActive]);

  useEffect(() => {
    const prev = prevTriggerRef.current;
    prevTriggerRef.current = triggerCount;

    // Fire one OCR pass each time the trigger counter increases.
    if (triggerCount <= prev) return;
    if (!isActive || !cameraRef.current) return;
    if (inFlightRef.current) return;

    const now = Date.now();
    if (now - lastFireRef.current < THROTTLE_MS) return;
    lastFireRef.current = now;

    const run = async () => {
      inFlightRef.current = true;
      setIsRecognizing(true);
      // Snapshot the session this read belongs to; if it changes during the
      // awaits below (reset / inactive), we discard the result.
      const myGen = genRef.current;
      try {
        if (!cameraRef.current) return;

        // Snap a low-quality throwaway still and OCR it with the platform's
        // native engine:
        //   iOS     → Apple Vision (VNRecognizeTextRequest) — works on device
        //             AND simulator, returns per-line confidence.
        //   Android → Google ML Kit (bundled model) — plain text, no confidence.
        // ~200–400 ms on modern hardware. Server OCR at capture time stays the
        // source of truth.
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          enableShutterSound: false,
        });
        const uri = photo.path.startsWith('file://')
          ? photo.path
          : `file://${photo.path}`;

        let lines: OCRLine[] = [];
        let engine: 'vision' | 'mlkit' | 'none' = 'none';
        if (Platform.OS === 'ios') {
          engine = 'vision';
          const result = await DocumentDetector.recognizeText(uri);
          lines = result.map((l) => ({ text: l.text, confidence: l.confidence }));
        } else {
          const recognizer = loadRecognizer();
          if (recognizer) {
            engine = 'mlkit';
            const result = await recognizer.recognize(uri);
            // ML Kit's plain-text path has no per-line confidence — split into
            // lines (weight 1 each → count-based voting).
            lines = (result.text ?? '')
              .split('\n')
              .map((t) => t.trim())
              .filter((t) => t.length > 0)
              .map((t) => ({ text: t }));
          }
        }

        // The framing session ended (document left / camera went inactive) while
        // this read was in flight — discard it so it can't repopulate a cleared
        // tally or resurrect chips after capture.
        if (myGen !== genRef.current) return;

        const rawText = lines.map((l) => l.text).join('\n');
        lastTextRef.current = rawText.length > 0 ? rawText : null;

        // Accumulate this read's weighted candidates into the running vote
        // tallies, then pick the best-supported value per field. A one-frame
        // misread is outvoted by the consistent value; a sharper/later read (and
        // within-read repeats, e.g. a VRM printed in several places) builds
        // weight; reset() clears the tallies between tickets.
        const candidates = extractTicketFieldCandidates(lines);
        const votes = votesRef.current;
        (['pcn', 'vrm', 'issuer'] as const).forEach((field) => {
          for (const candidate of candidates[field]) {
            votes[field].set(
              candidate.value,
              (votes[field].get(candidate.value) ?? 0) + candidate.weight,
            );
          }
        });
        const winners: ExtractedTicketFields = {
          pcn: winner(votes.pcn),
          vrm: winner(votes.vrm),
          issuer: winner(votes.issuer),
        };
        fieldsRef.current = winners;
        setFields(winners);

        if (__DEV__) {
          const g = globalThis as { __scannerDebug?: Record<string, unknown> };
          g.__scannerDebug = {
            ...(g.__scannerDebug ?? {}),
            ocrEngine: engine,
            ocrTextLen: rawText.length,
            ocrText: rawText,
            ocrVotes: {
              pcn: Object.fromEntries(votes.pcn),
              vrm: Object.fromEntries(votes.vrm),
              issuer: Object.fromEntries(votes.issuer),
            },
            ocrAt: new Date().toISOString(),
          };
        }
      } catch (err) {
        // Surface the failure to Sentry so we can see why live OCR fails on
        // real devices without enabling verbose logging. The chip flow still
        // fails soft — production users just see empty chips, not a crash —
        // but we get a breadcrumb to debug from. `import` is lazy so this
        // doesn't pull Sentry into the dev-mock path.
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
          const Sentry = require('@sentry/react-native');
          Sentry.captureException(err, { tags: { source: 'useLiveTicketOCR' } });
        } catch {
          // Sentry not available — swallow, original silent-drop behavior.
        }
        // Also write to debug global for in-app inspection via debugger.
        const g = globalThis as { __scannerDebug?: Record<string, unknown> };
        g.__scannerDebug = {
          ...(g.__scannerDebug ?? {}),
          lastOCRError: String(err),
          lastOCRErrorAt: new Date().toISOString(),
        };
        // Live OCR is best-effort. Silently drop failures so a transient
        // hiccup doesn't disturb the scanning UX.
      } finally {
        inFlightRef.current = false;
        setIsRecognizing(false);
      }
    };

    run();
  }, [triggerCount, isActive, cameraRef]);

  return {
    ...fields,
    isRecognizing,
    getLastOCRText: () => lastTextRef.current,
    getFields,
    reset,
  };
};

export default useLiveTicketOCR;
