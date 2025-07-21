import {
  Address,
  TicketForChallengeLetter,
  UserForChallengeLetter,
} from '@/types';

export const generateChallengeEmailPrompt = (
  userName: string,
  pcnNumber: string,
  issuer: string,
) =>
  `Generate an email for ${userName} regarding the challenge letter for PCN ${pcnNumber} issued by ${issuer}. The letter has been generated and will be attached as a PDF.`;

export const generateOcrAnalysisPrompt = (ocrText: string) =>
  `Please extract the required details from the following OCR text extracted from a parking ticket image:\n\n${ocrText}`;
