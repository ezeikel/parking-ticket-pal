'use server';

import { z } from 'zod';

const feedbackSchema = z.object({
  category: z.enum(['issue', 'idea', 'other']),
  text: z.string().min(1, 'Feedback cannot be empty.'),
  userEmail: z.string().email().optional(),
});

// eslint-disable-next-line import/prefer-default-export
export const sendFeedback = async (prevState: any, formData: FormData) => {
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
    console.error('Feedback Fish project ID is not set.');
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
      console.error('Failed to send feedback:', errorData);
      return { message: 'Failed to send feedback. Please try again.' };
    }

    return { success: true, message: 'Feedback sent successfully!' };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending feedback:', error);
    return { message: 'An unexpected error occurred.' };
  }
};
