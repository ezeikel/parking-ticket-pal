/* eslint-disable no-restricted-syntax, no-continue */
import { NextRequest, NextResponse } from 'next/server';
import { createServerLogger } from '@/lib/logger';
import { handleTriggerComment } from '@/lib/instagram-automation';

const log = createServerLogger({ action: 'facebook-webhook' });

const VERIFY_TOKEN =
  process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'ptp-secret-verify';

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
  try {
    const body = await req.json();
    console.log(
      '[webhook] Event received:',
      JSON.stringify({ object: body.object, entryCount: body.entry?.length }),
    );

    if (body.object === 'instagram') {
      const promises: Promise<void>[] = [];

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          console.log('[webhook] Change field:', change.field);

          if (change.field === 'comments') {
            const { id: commentId, text, from, media } = change.value || {};
            console.log(
              '[webhook] Comment payload:',
              JSON.stringify({ commentId, text, from, mediaId: media?.id }),
            );

            if (!commentId || !text || !from || !media) {
              console.warn('[webhook] Incomplete comment payload');
              continue;
            }

            const trimmedText = text.trim();
            if (TRIGGER_PATTERNS.test(trimmedText)) {
              console.log('[webhook] Trigger match! Processing...');

              // Await the handler — Vercel kills async work after response
              promises.push(
                handleTriggerComment({
                  commentId,
                  commenterId: from.id,
                  commenterUsername: from.username,
                  mediaId: media.id,
                }).catch((error) => {
                  console.error('[webhook] handleTriggerComment error:', error);
                }),
              );
            } else {
              console.log('[webhook] Not a trigger comment:', trimmedText);
            }
          }
        }
      }

      // Wait for all handlers to complete before returning
      if (promises.length > 0) {
        await Promise.all(promises);
        console.log('[webhook] All handlers completed');
      }
    } else {
      console.log('[webhook] Ignoring non-instagram object:', body.object);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[webhook] Error processing webhook:', error);
    return new NextResponse('OK', { status: 200 });
  }
};
