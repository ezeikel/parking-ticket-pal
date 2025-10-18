'use server';

import { z } from 'zod';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'feedback' });

const feedbackSchema = z.object({
  category: z.enum(['issue', 'idea', 'other']),
  text: z.string().min(1, 'Feedback cannot be empty.'),
  userEmail: z.string().email().optional(),
});

// eslint-disable-next-line import/prefer-default-export
export const sendFeedback = async (_prevState: any, formData: FormData) => {
  const validatedFields = feedbackSchema.safeParse({
    category: formData.get('category'),
    text: formData.get('text'),
    userEmail: formData.get('userEmail'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  const { category, text, userEmail } = validatedFields.data;
  const projectId = process.env.NEXT_PUBLIC_FEEDBACK_FISH_PROJECT_ID;

  if (!projectId) {
    logger.error('Feedback Fish project ID is not set', {
      category,
      hasUserEmail: !!userEmail
    });
    return { message: 'Server configuration error.' };
  }

  try {
    const response = await fetch('https://api.feedback.fish/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        text,
        category,
        userId: userEmail,
        metadata: {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to send feedback to Feedback Fish', {
        category,
        hasUserEmail: !!userEmail,
        responseStatus: response.status,
        errorData
      });
      return { message: 'Failed to send feedback. Please try again.' };
    }

    return { success: true, message: 'Feedback sent successfully!' };
  } catch (error) {
    logger.error('Error sending feedback', {
      category,
      hasUserEmail: !!userEmail
    }, error instanceof Error ? error : new Error(String(error)));
    return { message: 'An unexpected error occurred.' };
  }
};
