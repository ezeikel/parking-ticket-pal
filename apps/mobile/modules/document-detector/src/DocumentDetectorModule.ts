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

declare class DocumentDetectorModule extends NativeModule<{}> {
  // Returns null when no document is detected in the image.
  detectDocument(uri: string): Promise<DetectDocumentResult | null>;
}

export default requireNativeModule<DocumentDetectorModule>('DocumentDetector');
