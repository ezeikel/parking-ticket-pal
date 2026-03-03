/* eslint-disable no-restricted-syntax, no-continue */
import { NextRequest, NextResponse } from 'next/server';
import { createServerLogger } from '@/lib/logger';
import { handleTriggerComment } from '@/lib/instagram-automation';

const log = createServerLogger({ action: 'facebook-webhook' });

const VERIFY_TOKEN =
  process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'ptp-secret-verify';

/** Our own Instagram account ID — ignore comments from ourselves */
const OWN_IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;

/** Comment text patterns that trigger the DM automation */
const TRIGGER_PATTERNS = /^(ptp|link)$/i;

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    log.info('Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }
  log.warn('Webhook verification failed');
  return new NextResponse('Verification failed', { status: 403 });
};

export const POST = async (req: NextRequest) => {
  const debugLog: string[] = [];

  try {
    const body = await req.json();
    debugLog.push(`[webhook] FULL BODY: ${JSON.stringify(body)}`);

    if (body.object === 'instagram') {
      const promises: Promise<void>[] = [];

      for (const entry of body.entry || []) {
        debugLog.push(`[webhook] Entry keys: ${Object.keys(entry).join(',')}`);
        debugLog.push(`[webhook] Entry: ${JSON.stringify(entry)}`);

        for (const change of entry.changes || []) {
          debugLog.push(`[webhook] Change field: ${change.field}`);
          debugLog.push(
            `[webhook] Change value: ${JSON.stringify(change.value)}`,
          );

          if (change.field === 'comments') {
            const { id: commentId, text, from, media } = change.value || {};

            if (!commentId || !text || !from || !media) {
              debugLog.push('[webhook] Incomplete comment payload');
              continue;
            }

            // Ignore our own comments (replies we post)
            if (from.id === OWN_IG_ACCOUNT_ID) {
              debugLog.push('[webhook] Ignoring own comment');
              continue;
            }

            const trimmedText = text.trim();
            if (TRIGGER_PATTERNS.test(trimmedText)) {
              debugLog.push(
                `[webhook] Trigger match! from=${from.username} media=${media.id}`,
              );

              promises.push(
                handleTriggerComment({
                  commentId,
                  commenterId: from.id,
                  commenterUsername: from.username,
                  mediaId: media.id,
                })
                  .then(() => {
                    debugLog.push('[webhook] Handler completed successfully');
                  })
                  .catch((error) => {
                    debugLog.push(`[webhook] Handler error: ${error}`);
                  }),
              );
            } else {
              debugLog.push(`[webhook] Not a trigger: "${trimmedText}"`);
            }
          }
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } else {
      debugLog.push(`[webhook] Non-instagram object: ${body.object}`);
    }

    // Log everything at once
    // eslint-disable-next-line no-console
    console.log(debugLog.join('\n'));
    return new NextResponse(debugLog.join('\n'), { status: 200 });
  } catch (error) {
    debugLog.push(`[webhook] ERROR: ${error}`);
    // eslint-disable-next-line no-console
    console.log(debugLog.join('\n'));
    return new NextResponse(debugLog.join('\n'), { status: 200 });
  }
};
