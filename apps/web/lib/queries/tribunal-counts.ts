'use cache';

import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@parking-ticket-pal/db';

/**
 * Get the count of tribunal cases for a specific issuer.
 * Only returns aggregate counts — never success rates or case details.
 */
export const getTribunalCaseCountByIssuer = async (
  normalizedIssuerId: string,
): Promise<number> => {
  cacheLife('hours');
  cacheTag('tribunal-counts', `tribunal-issuer-${normalizedIssuerId}`);

  try {
    return await db.londonTribunalCase.count({
      where: { normalizedIssuerId },
    });
  } catch {
    return 0;
  }
};

/**
 * Get the count of tribunal cases for a specific contravention code.
 * Only returns aggregate counts — never success rates or case details.
 */
export const getTribunalCaseCountByCode = async (
  normalizedContraventionCode: string,
): Promise<number> => {
  cacheLife('hours');
  cacheTag('tribunal-counts', `tribunal-code-${normalizedContraventionCode}`);

  try {
    return await db.londonTribunalCase.count({
      where: { normalizedContraventionCode },
    });
  } catch {
    return 0;
  }
};

/**
 * Get the total count of all tribunal cases.
 * Only returns aggregate count — never success rates or case details.
 */
export const getTotalTribunalCaseCount = async (): Promise<number> => {
  cacheLife('hours');
  cacheTag('tribunal-counts', 'tribunal-total');

  try {
    return await db.londonTribunalCase.count();
  } catch {
    return 0;
  }
};
