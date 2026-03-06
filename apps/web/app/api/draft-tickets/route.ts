import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { getUserId } from '@/utils/user';

const log = createServerLogger({ action: 'draft-tickets' });

/**
 * GET /api/draft-tickets
 *
 * Returns all draft tickets for the authenticated user.
 */
// eslint-disable-next-line import-x/prefer-default-export
export const GET = async () => {
  try {
    const userId = await getUserId('get draft tickets');

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftTickets = await db.draftTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ draftTickets });
  } catch (error) {
    log.error(
      'Error fetching draft tickets',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
