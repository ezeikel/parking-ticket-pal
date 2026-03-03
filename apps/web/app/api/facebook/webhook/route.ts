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
  // Always return 200 quickly — Facebook requires response within 5 seconds
  try {
    const body = await req.json();
    log.info('Webhook event received', {
      object: body.object,
      entryCount: body.entry?.length,
    });

    if (body.object === 'instagram') {
      // Process Instagram webhook events
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'comments') {
            const { id: commentId, text, from, media } = change.value || {};

            if (!commentId || !text || !from || !media) {
              log.warn('Incomplete comment webhook payload', {
                change: change.value,
              });
              continue;
            }

            // Check if comment text matches trigger pattern
            const trimmedText = text.trim();
            if (TRIGGER_PATTERNS.test(trimmedText)) {
              log.info('Trigger comment detected', {
                commentId,
                text: trimmedText,
                from: from.username,
                mediaId: media.id,
              });

              // Handle asynchronously — don't block the 200 response
              handleTriggerComment({
                commentId,
                commenterId: from.id,
                commenterUsername: from.username,
                mediaId: media.id,
              }).catch((error) => {
                log.error(
                  'Error handling trigger comment',
                  { commentId },
                  error instanceof Error ? error : new Error(String(error)),
                );
              });
            }
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    log.error(
      'Error processing webhook',
      undefined,
      error instanceof Error ? error : undefined,
    );
    // Still return 200 to prevent Facebook from retrying
    return new NextResponse('OK', { status: 200 });
  }
};
