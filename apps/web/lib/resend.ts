import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export type ToolCategory = 'parking-templates' | 'bailiff-templates' | 'motoring-templates' | 'vehicle-tools';

export async function addToolsContact(
  email: string,
  firstName: string,
  _toolUsed: ToolCategory, // Reserved for future segmentation
) {
  const audienceId = process.env.RESEND_TOOLS_AUDIENCE_ID;

  if (!audienceId) {
    throw new Error('RESEND_TOOLS_AUDIENCE_ID is not configured');
  }

  const contact = await resend.contacts.create({
    email,
    firstName,
    audienceId,
    unsubscribed: false,
  });

  return contact;
}

export default resend;
