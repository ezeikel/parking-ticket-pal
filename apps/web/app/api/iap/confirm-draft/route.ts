import { db, TicketTier } from '@parking-ticket-pal/db';
import { verifyPurchase } from '@/lib/revenuecat';
import { decrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'iap-confirm-draft' });

/**
 * POST /api/iap/confirm-draft
 *
 * Confirms a RevenueCat consumable purchase when no ticket exists yet.
 * Creates a DraftTicket that the user can later fill in with details.
 */
// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  try {
    // Authenticate the user
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

    // Parse request body
    const { productId } = await req.json();

    if (!productId) {
      return Response.json({ error: 'Missing productId' }, { status: 400 });
    }

    // Only Premium purchases are supported
    if (!productId.startsWith('premium_ticket')) {
      return Response.json(
        {
          error: 'Invalid product ID. Expected premium_ticket_*',
        },
        { status: 400 },
      );
    }

    // Verify the purchase with RevenueCat
    const isPurchaseValid = await verifyPurchase(userId, productId);

    if (!isPurchaseValid) {
      return Response.json(
        {
          error:
            'Purchase verification failed. Please try again or contact support.',
        },
        { status: 400 },
      );
    }

    // Check for existing draft from this user to avoid duplicates on retry
    const existingDraft = await db.draftTicket.findFirst({
      where: { userId },
    });

    if (existingDraft) {
      return Response.json(
        {
          success: true,
          draftTicket: {
            id: existingDraft.id,
            tier: existingDraft.tier,
          },
        },
        { status: 200 },
      );
    }

    // Create DraftTicket and update user atomically
    const [draftTicket] = await db.$transaction([
      db.draftTicket.create({
        data: {
          userId,
          tier: TicketTier.PREMIUM,
          productId,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: { lastPremiumPurchaseAt: new Date() },
      }),
    ]);

    log.info('DraftTicket created from purchase without ticket', {
      userId,
      draftTicketId: draftTicket.id,
      productId,
    });

    return Response.json(
      {
        success: true,
        draftTicket: {
          id: draftTicket.id,
          tier: draftTicket.tier,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    log.error(
      'Error confirming draft purchase',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
