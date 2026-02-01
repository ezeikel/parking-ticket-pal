'use server';

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { render } from '@react-email/render';
import MagicLinkEmail from '@/components/emails/MagicLinkEmail';
import TicketReminderEmail from '@/components/emails/TicketReminderEmail';
import SocialDigestEmail from '@/emails/SocialDigestEmail';

const AttachmentSchema = z.object({
  filename: z.string(),
  content: z.instanceof(Buffer),
  contentType: z.string().optional(),
});

const EmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().min(1),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  text: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export type EmailAttachment = z.infer<typeof AttachmentSchema>;
export type EmailData = z.infer<typeof EmailSchema>;

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory rate limiting (consider using Redis in production)
const rateLimit: RateLimitStore = {};
const RATE_LIMIT_MAX = 50; // Max emails per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const limit = rateLimit[identifier];

  if (!limit || now > limit.resetTime) {
    rateLimit[identifier] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  limit.count += 1;
  return true;
};

const getFromAddress = (customFrom?: string): string =>
  customFrom ||
  `Parking Ticket Pal <${process.env.DEFAULT_FROM_EMAIL}>` ||
  'no-reply@notifications.parkingticketpal.com';

const createEmailTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required in production');
    }
    return { type: 'resend', client: new Resend(process.env.RESEND_API_KEY) };
  }

  // Development: Use Mailtrap if configured
  if (process.env.MAILTRAP_HOST && process.env.MAILTRAP_PORT) {
    return {
      type: 'mailtrap',
      client: nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: parseInt(process.env.MAILTRAP_PORT, 10),
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS,
        },
      }),
    };
  }

  // Fallback to Resend in development
  if (process.env.RESEND_API_KEY) {
    return { type: 'resend', client: new Resend(process.env.RESEND_API_KEY) };
  }

  throw new Error('No email service configured');
};

export const sendEmail = async (
  emailData: EmailData,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  try {
    // Validate input
    const validatedData = EmailSchema.parse(emailData);

    // Rate limiting
    const recipients = Array.isArray(validatedData.to)
      ? validatedData.to
      : [validatedData.to];
    const rateLimitFailed = recipients.find(
      (recipient) => !checkRateLimit(recipient),
    );
    if (rateLimitFailed) {
      return {
        success: false,
        error: `Rate limit exceeded for ${rateLimitFailed}`,
      };
    }

    const fromAddress = getFromAddress(validatedData.from);
    const transporter = createEmailTransporter();

    if (transporter.type === 'resend') {
      const resendClient = transporter.client as Resend;
      const result = await resendClient.emails.send({
        to: validatedData.to,
        from: fromAddress,
        subject: validatedData.subject,
        html: validatedData.html,
        text: validatedData.text,
        replyTo: validatedData.replyTo,
        attachments: validatedData.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
        })),
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    }

    // Mailtrap
    const mailtrapClient = transporter.client as nodemailer.Transporter;
    const result = await mailtrapClient.sendMail({
      to: validatedData.to,
      from: fromAddress,
      subject: validatedData.subject,
      html: validatedData.html,
      text: validatedData.text,
      replyTo: validatedData.replyTo,
      attachments: validatedData.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    Sentry.captureException(error, {
      tags: {
        service: 'email',
        action: 'send_email',
      },
      extra: {
        to: emailData.to,
        subject: emailData.subject,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
};

export const sendBatchEmails = async (
  emails: EmailData[],
): Promise<{
  success: boolean;
  results: Array<{
    success: boolean;
    messageId?: string;
    error?: string;
    recipient: string | string[];
  }>;
}> => {
  const results = await Promise.all(
    emails.map(async (email, index) => {
      // Add delay for each email to avoid overwhelming the service
      if (index > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
      }

      const result = await sendEmail(email);
      return {
        ...result,
        recipient: email.to,
      };
    }),
  );

  const overallSuccess = results.every((result) => result.success);

  return {
    success: overallSuccess,
    results,
  };
};

export const sendMagicLinkEmail = async (
  to: string,
  magicLink: string,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const emailHtml = await render(MagicLinkEmail({ magicLink }));

  return sendEmail({
    to,
    subject: 'Sign in to Parking Ticket Pal',
    html: emailHtml,
    text: `Sign in to Parking Ticket Pal\n\nClick this link to sign in: ${magicLink}\n\nThis link will expire in 15 minutes.`,
  });
};

export const sendTicketReminder = async (
  to: string,
  ticketData: {
    pcnNumber: string;
    dueDate: string;
    amount: string;
  },
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const emailHtml = await render(
    TicketReminderEmail({
      pcnNumber: ticketData.pcnNumber,
      dueDate: ticketData.dueDate,
      amount: ticketData.amount,
    }),
  );

  return sendEmail({
    to,
    subject: `Reminder: Parking Ticket ${ticketData.pcnNumber} Due Soon`,
    html: emailHtml,
    text: `Parking Ticket Reminder\n\nYour parking ticket ${ticketData.pcnNumber} is due on ${ticketData.dueDate} for £${ticketData.amount}.\n\nView in dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });
};

export type SocialDigestCaption = {
  platform: string;
  caption: string;
  autoPosted: boolean;
  assetType: 'image' | 'video' | 'both';
  title?: string;
  description?: string;
};

export const sendSocialDigest = async (
  to: string,
  digestData: {
    blogTitle: string;
    blogUrl: string;
    imageUrl: string;
    videoUrl: string;
    captions: SocialDigestCaption[];
  },
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const emailHtml = await render(
    SocialDigestEmail({
      blogTitle: digestData.blogTitle,
      blogUrl: digestData.blogUrl,
      imageUrl: digestData.imageUrl,
      videoUrl: digestData.videoUrl,
      captions: digestData.captions,
    }),
  );

  // Generate plain text version
  const captionsText = digestData.captions
    .map(
      (c) =>
        `${c.platform.toUpperCase()} ${c.autoPosted ? '(Auto-posted)' : '(Manual)'}:\n${c.title ? `Title: ${c.title}\n` : ''}${c.description || c.caption}`,
    )
    .join('\n\n---\n\n');

  return sendEmail({
    to,
    subject: `Social Media Assets Ready: ${digestData.blogTitle}`,
    html: emailHtml,
    text: `Social Media Assets Ready: ${digestData.blogTitle}\n\nAssets:\n- Image: ${digestData.imageUrl}\n- Video: ${digestData.videoUrl}\n\nCaptions:\n\n${captionsText}\n\nView blog post: ${digestData.blogUrl}`,
  });
};
