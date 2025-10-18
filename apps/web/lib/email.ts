'use server';

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';

const EmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().min(1),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  text: z.string().optional(),
});

type EmailData = z.infer<typeof EmailSchema>;

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
  customFrom || process.env.DEFAULT_FROM_EMAIL || 'no-reply@parkingticketpal.com';

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

export const sendEmail = async (emailData: EmailData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  try {
    // Validate input
    const validatedData = EmailSchema.parse(emailData);

    // Rate limiting
    const recipients = Array.isArray(validatedData.to) ? validatedData.to : [validatedData.to];
    const rateLimitFailed = recipients.find(recipient => !checkRateLimit(recipient));
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
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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

export const sendBatchEmails = async (emails: EmailData[]): Promise<{
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
        await new Promise(resolve => { setTimeout(resolve, 100); });
      }

      const result = await sendEmail(email);
      return {
        ...result,
        recipient: email.to,
      };
    })
  );

  const overallSuccess = results.every(result => result.success);

  return {
    success: overallSuccess,
    results,
  };
};

export const sendMagicLinkEmail = async (to: string, magicLink: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => sendEmail({
    to,
    subject: 'Sign in to Parking Ticket Pal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Sign in to Parking Ticket Pal</h2>
        <p>Click the button below to sign in to your account:</p>
        <a href="${magicLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Sign In</a>
        <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.</p>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 12px;">${magicLink}</p>
      </div>
    `,
    text: `Sign in to Parking Ticket Pal\n\nClick this link to sign in: ${magicLink}\n\nThis link will expire in 15 minutes.`,
  });

export const sendTicketReminder = async (to: string, ticketData: {
  pcnNumber: string;
  dueDate: string;
  amount: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => sendEmail({
    to,
    subject: `Reminder: Parking Ticket ${ticketData.pcnNumber} Due Soon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Parking Ticket Reminder</h2>
        <p>Your parking ticket <strong>${ticketData.pcnNumber}</strong> is due soon.</p>
        <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p><strong>PCN Number:</strong> ${ticketData.pcnNumber}</p>
          <p><strong>Due Date:</strong> ${ticketData.dueDate}</p>
          <p><strong>Amount:</strong> £${ticketData.amount}</p>
        </div>
        <p>Don't forget to take action before the deadline to avoid additional charges.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">View in Dashboard</a>
      </div>
    `,
    text: `Parking Ticket Reminder\n\nYour parking ticket ${ticketData.pcnNumber} is due on ${ticketData.dueDate} for £${ticketData.amount}.\n\nView in dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

// Export types
export type { EmailData };
