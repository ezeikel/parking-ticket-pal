import { useMutation } from "@tanstack/react-query";
import { processImageWithOCR } from "../../api";

export type OCRProcessingResult = {
  success: boolean;
  message?: string;
  data?: {
    pcnNumber: string;
    vehicleReg: string;
    issuedAt: Date;
    contraventionCode: string;
    initialAmount: number;
    issuer: string;
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
  };
  image?: string;
  imageUrl?: string;
  tempImagePath?: string;
  ocrText?: string;
};

const useOCR = () => 
  useMutation<OCRProcessingResult, Error, string>({
    mutationFn: processImageWithOCR,
  });

export default useOCR;