import type { IssuerScraper } from './types';
import lewishamScraper from './lewisham';

const scrapers: IssuerScraper[] = [
  lewishamScraper,
  // Stubs for future scrapers:
  // horizonScraper,
  // westminsterScraper,
];

export function detectIssuer(url: string): IssuerScraper | null {
  for (const scraper of scrapers) {
    for (const pattern of scraper.urlPatterns) {
      if (url.includes(pattern)) {
        return scraper;
      }
    }
  }
  return null;
}

export function getScraperById(id: string): IssuerScraper | null {
  return scrapers.find((s) => s.id === id) ?? null;
}
