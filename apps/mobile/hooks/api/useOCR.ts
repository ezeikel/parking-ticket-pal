import { useMutation } from "@tanstack/react-query";
import { processImageWithOCR } from "../../api";

export type OCRProcessingResult = {
  success: boolean;
  message?: string;
  data?: {
    documentType: 'ticket' | 'letter' | 'unrelated';
    pcnNumber: string;
    vehicleReg: string;
    issuedAt: Date;
    contraventionCode: string;
    initialAmount: number;
    issuer: string;
    issuerType: string;
    location: {
      line1: string;
      city: string;
      postcode: string;
      county?: string;
      country: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    summary: string;
    sentAt: Date | null;
    extractedText: string;
    letterType: string | null;
    currentAmount: number | null;
  };
  image?: string;
  imageUrl?: string;
  tempImagePath?: string;
  ocrText?: string;
};

type OCRMutationArgs = {
  scannedImage: string;
  ocrText?: string;
};

const useOCR = () =>
  useMutation<OCRProcessingResult, Error, OCRMutationArgs>({
    mutationFn: ({ scannedImage, ocrText }) =>
      processImageWithOCR(scannedImage, ocrText),
  });

export default useOCR;
