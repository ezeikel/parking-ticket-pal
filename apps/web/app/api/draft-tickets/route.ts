import { db } from '@parking-ticket-pal/db';
import { decrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'draft-tickets' });

/**
 * GET /api/draft-tickets
 *
 * Returns all draft tickets for the authenticated user.
 */
// eslint-disable-next-line import-x/prefer-default-export
export const GET = async (req: Request) => {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const session = await decrypt(token);

    if (!session || !session.id) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = session.id as string;

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
