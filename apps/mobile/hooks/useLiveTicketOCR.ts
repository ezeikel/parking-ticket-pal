import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Camera as CameraType } from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';

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
};

const THROTTLE_MS = 1500;

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

  // Clear when camera goes inactive (e.g. after capture, when PostCapture mounts).
  useEffect(() => {
    if (!isActive) {
      setFields({});
      setIsRecognizing(false);
      lastFireRef.current = 0;
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
        const photo = await cameraRef.current!.takePhoto({
          flash: 'off',
          enableShutterSound: false,
        });
        const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
        const result = await TextRecognition.recognize(uri);
        setFields(extractTicketFields(result.text ?? ''));
      } catch {
        // Live OCR is best-effort. Silently drop failures so a transient
        // takePhoto/recognize hiccup doesn't disturb the scanning UX.
      } finally {
        inFlightRef.current = false;
        setIsRecognizing(false);
      }
    };

    run();
  }, [stabilityProgress, isActive, cameraRef]);

  return { ...fields, isRecognizing };
};

export default useLiveTicketOCR;
