'use server';

import { addNewsletterContact } from '@/lib/resend';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'newsletter' });

// eslint-disable-next-line import-x/prefer-default-export
export async function subscribeNewsletter(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await addNewsletterContact(email);
    return { success: true };
  } catch (error) {
    log.error(
      'Failed to subscribe to newsletter',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to subscribe',
    };
  }
}
