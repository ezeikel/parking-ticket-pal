import type { IssuerScraper } from './types';
import type { ScrapedEvidence } from '@/shared/types';

const lewishamScraper: IssuerScraper = {
  id: 'lewisham',
  displayName: 'Lewisham Council',
  urlPatterns: ['pcnevidence.lewisham.gov.uk'],
  detailPagePattern: /pcnevidence\.lewisham\.gov\.uk\/(ticketdetails|pcnonline)/,

  scrape() {
    // --- Header section: parallel .pcnHeaderLabel / .pcnHeaderData arrays ---
    const headerLabels = document.querySelectorAll('.pcnHeaderLabel');
    const headerData = document.querySelectorAll('.pcnHeaderData');
    const headerMap: Record<string, string> = {};
    headerLabels.forEach((label, i) => {
      const key = (label.textContent || '').trim().toLowerCase();
      const value = headerData[i]?.textContent?.trim() || '';
      if (key && value) headerMap[key] = value;
    });

    // --- Detail section: .MainTextLabelNoWrap in MuiGrid-item, value in next sibling grid item ---
    const detailMap: Record<string, string> = {};
    const detailLabels = document.querySelectorAll('.MainTextLabelNoWrap');
    for (const label of detailLabels) {
      const key = (label.textContent || '').trim().toLowerCase();
      if (!key) continue;
      const gridItem = label.closest('.MuiGrid-item');
      const nextGrid = gridItem?.nextElementSibling;
      if (nextGrid) {
        const value = (nextGrid.textContent || '').trim();
        if (value) detailMap[key] = value;
      }
    }

    // --- Extract fields ---
    const pcnNumber = headerMap['penalty charge notice'] || null;
    const vehicleReg = headerMap['vehicle registration number'] || null;

    // Fallback: search page inputs (if user is still on search page)
    const finalPcn = pcnNumber
      || document.querySelector<HTMLInputElement>('#txt_penalityChargeNotice')?.value?.trim()
      || null;
    const finalVrm = vehicleReg
      || document.querySelector<HTMLInputElement>('#txt_vehicleRegistrationNumber')?.value?.trim()
      || null;

    if (!finalPcn) return null;

    // Outstanding amount (e.g. "£ 160")
    let initialAmount: number | null = null;
    const amountText = detailMap['outstanding charge'];
    if (amountText) {
      const match = amountText.match(/£\s*(\d+(?:\.\d{2})?)/);
      if (match) initialAmount = Math.round(parseFloat(match[1]) * 100);
    }

    // Contravention code (e.g. "02 - A: Parked or loading...")
    let contraventionCode: string | null = null;
    const contraventionText = detailMap['contravention'];
    if (contraventionText) {
      const codeMatch = contraventionText.match(/^(\d+)/);
      if (codeMatch) contraventionCode = codeMatch[1];
    }

    // Location
    const location = detailMap['location'] || null;

    // Date (e.g. "Friday 30th January 2026 at 10:09 pm")
    let issuedAt: string | null = null;
    const dateText = headerMap['contravention date and time'];
    if (dateText) {
      const cleaned = dateText
        .replace(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*/i, '')
        .replace(/(\d+)(?:st|nd|rd|th)/, '$1')
        .replace(/\s+at\s+/, ' ')
        .trim();
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) issuedAt = parsed.toISOString();
    }

    // --- Evidence images from Azure blob storage ---
    const evidence: ScrapedEvidence[] = [];
    const images = document.querySelectorAll<HTMLImageElement>('img');
    const seenUrls = new Set<string>();

    for (const img of images) {
      const src = img.src;
      if (!src) continue;
      // Evidence images are hosted on Azure blob: strnpsproddefault.blob.core.windows.net/caseattachments/
      if (!src.includes('caseattachments')) continue;
      if (seenUrls.has(src)) continue;
      seenUrls.add(src);

      evidence.push({
        imageUrl: src,
        description: img.alt || 'Evidence image from Lewisham portal',
        evidenceType: 'OTHER',
      });
    }

    return {
      ticket: {
        pcnNumber: finalPcn,
        vehicleReg: finalVrm,
        issuedAt,
        contraventionCode,
        initialAmount,
        issuer: 'lewisham',
        issuerDisplayName: 'Lewisham Council',
        location,
      },
      evidence,
    };
  },
};

export default lewishamScraper;
