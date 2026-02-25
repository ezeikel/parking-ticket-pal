'use server';

import { addWaitlistContact } from '@/lib/resend';
import { createServerLogger } from '@/lib/logger';
import { createWaitlistSignup } from '@/services/waitlist-sequence';

const log = createServerLogger({ action: 'waitlist' });

// eslint-disable-next-line import-x/prefer-default-export
export async function joinWaitlist(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create DB record and initialize email sequence
    await createWaitlistSignup(email);

    // Also add to Resend segment (for manual broadcasts / segment management)
    try {
      await addWaitlistContact(email);
    } catch (resendError) {
      // Non-fatal — DB record is the source of truth for the drip sequence.
      // Resend segment is a nice-to-have for manual management.
      log.warn(
        'Failed to add waitlist contact to Resend segment (non-fatal)',
        undefined,
        resendError instanceof Error ? resendError : undefined,
      );
    }

    return { success: true };
  } catch (error) {
    log.error(
      'Failed to join mobile app waitlist',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join waitlist',
    };
  }
}
