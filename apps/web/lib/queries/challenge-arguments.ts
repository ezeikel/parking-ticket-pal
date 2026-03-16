'use cache';

import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@parking-ticket-pal/db';

type ChallengeArgumentRow = {
  id: string;
  contraventionCode: string;
  argumentType: string;
  heading: string;
  content: string;
  signDiagramUrls: string[];
  sourceUrl: string;
};

export type GroupedChallengeArguments = {
  legalPoints: ChallengeArgumentRow[];
  signRequirements: ChallengeArgumentRow[];
  casePrecedents: ChallengeArgumentRow[];
  proceduralTips: ChallengeArgumentRow[];
};

/**
 * Fetch ChallengeArgument rows for a contravention code, grouped by argumentType.
 */
export const getChallengeArgumentsByCode = async (
  contraventionCode: string,
): Promise<GroupedChallengeArguments> => {
  cacheLife('hours');
  cacheTag('challenge-arguments', `challenge-arguments-${contraventionCode}`);

  try {
    const rows = await db.challengeArgument.findMany({
      where: { contraventionCode },
      orderBy: { createdAt: 'asc' },
    });

    return {
      legalPoints: rows.filter((r) => r.argumentType === 'legal_point'),
      signRequirements: rows.filter(
        (r) => r.argumentType === 'sign_requirement',
      ),
      casePrecedents: rows.filter((r) => r.argumentType === 'case_precedent'),
      proceduralTips: rows.filter((r) => r.argumentType === 'procedural_tip'),
    };
  } catch {
    return {
      legalPoints: [],
      signRequirements: [],
      casePrecedents: [],
      proceduralTips: [],
    };
  }
};
