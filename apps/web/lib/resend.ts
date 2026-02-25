import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export type ToolCategory =
  | 'parking-templates'
  | 'bailiff-templates'
  | 'motoring-templates'
  | 'vehicle-tools';

/**
 * Create a contact (or update if exists) and add to a segment.
 */
async function addContactToSegment(
  email: string,
  segmentId: string,
  options?: { firstName?: string },
) {
  // Create the contact globally (idempotent — updates if email exists)
  const { error: createError } = await resend.contacts.create({
    email,
    firstName: options?.firstName,
    unsubscribed: false,
  });

  if (createError) {
    throw new Error(`Failed to create contact: ${createError.message}`);
  }

  // Add to segment
  const { error: segmentError } = await resend.contacts.segments.add({
    email,
    segmentId,
  });

  if (segmentError) {
    throw new Error(
      `Failed to add contact to segment: ${segmentError.message}`,
    );
  }
}

/**
 * Add a contact to the PTP Free Tools segment.
 */
export async function addToolsContact(
  email: string,
  firstName: string,
  _toolUsed: ToolCategory,
) {
  const segmentId = process.env.RESEND_TOOLS_SEGMENT_ID;

  if (!segmentId) {
    throw new Error('RESEND_TOOLS_SEGMENT_ID is not configured');
  }

  return addContactToSegment(email, segmentId, { firstName });
}

/**
 * Add a contact to the PTP newsletter segment.
 */
export async function addNewsletterContact(email: string) {
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;

  if (!segmentId) {
    throw new Error('RESEND_NEWSLETTER_SEGMENT_ID is not configured');
  }

  return addContactToSegment(email, segmentId);
}

/**
 * Add a contact to the PTP mobile app waitlist segment.
 */
export async function addWaitlistContact(email: string) {
  const segmentId = process.env.RESEND_WAITLIST_SEGMENT_ID;

  if (!segmentId) {
    throw new Error('RESEND_WAITLIST_SEGMENT_ID is not configured');
  }

  return addContactToSegment(email, segmentId);
}

export default resend;
