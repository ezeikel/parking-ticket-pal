import type { ScrapedTicketData, ScrapedEvidence } from '@/shared/types';

export interface IssuerScraper {
  id: string;
  displayName: string;
  urlPatterns: string[];
  detailPagePattern: RegExp;
  scrape: () => { ticket: ScrapedTicketData; evidence: ScrapedEvidence[] } | null;
}
