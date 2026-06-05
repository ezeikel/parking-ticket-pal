import { NativeModule, requireNativeModule } from 'expo';

export type DocumentCornerPoint = { x: number; y: number };

export type DetectDocumentResult = {
  // 4 corners in normalized [0,1] top-left-origin space, ordered:
  // top-left, top-right, bottom-right, bottom-left.
  corners: DocumentCornerPoint[];
  confidence: number;
  imageWidth: number;
  imageHeight: number;
};

// One recognized line. `confidence` is Vision's 0–1 score for the line's best
// candidate — used to weight the JS-side consensus vote per field.
export type RecognizedTextLine = {
  text: string;
  confidence: number;
};

declare class DocumentDetectorModule extends NativeModule<{}> {
  // Returns null when no document is detected in the image.
  detectDocument(uri: string): Promise<DetectDocumentResult | null>;

  // Apple Vision OCR (VNRecognizeTextRequest). Returns one { text, confidence }
  // entry per recognized line ([] if nothing found). iOS-only, but runs on the
  // simulator too — unlike Google ML Kit, which has no arm64-simulator slice.
  recognizeText(uri: string): Promise<RecognizedTextLine[]>;
}

export default requireNativeModule<DocumentDetectorModule>('DocumentDetector');
