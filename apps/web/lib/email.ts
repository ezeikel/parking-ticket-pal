'use server';

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { render } from '@react-email/render';
import MagicLinkEmail from '@/components/emails/MagicLinkEmail';
import TicketReminderEmail from '@/components/emails/TicketReminderEmail';
import SocialDigestEmail from '@/emails/SocialDigestEmail';
import NewsVideoSkippedEmail from '@/emails/NewsVideoSkippedEmail';
import NewsVideoFailedEmail from '@/emails/NewsVideoFailedEmail';
import WelcomeEmail from '@/emails/WelcomeEmail';
import OnboardingQuickWinEmail from '@/emails/onboarding/OnboardingQuickWinEmail';
import OnboardingDeadlineEmail from '@/emails/onboarding/OnboardingDeadlineEmail';
import OnboardingSocialProofEmail from '@/emails/onboarding/OnboardingSocialProofEmail';
import OnboardingHowItWorksEmail from '@/emails/onboarding/OnboardingHowItWorksEmail';
import OnboardingMathsEmail from '@/emails/onboarding/OnboardingMathsEmail';
import OnboardingFinalWarningEmail from '@/emails/onboarding/OnboardingFinalWarningEmail';

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

type RateLimitStore = Record<
  string,
  {
    count: number;
    resetTime: number;
  }
>;

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
  results: {
    success: boolean;
    messageId?: string;
    error?: string;
    recipient: string | string[];
  }[];
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
    sourceArticleUrl?: string;
    sourceArticleName?: string;
    voiceoverTranscript?: string;
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
      sourceArticleUrl: digestData.sourceArticleUrl,
      sourceArticleName: digestData.sourceArticleName,
      voiceoverTranscript: digestData.voiceoverTranscript,
    }),
  );

  // Generate plain text version
  const captionsText = digestData.captions
    .map(
      (c) =>
        `${c.platform.toUpperCase()} ${c.autoPosted ? '(Auto-posted)' : '(Manual)'}:\n${c.title ? `Title: ${c.title}\n` : ''}${c.description || c.caption}`,
    )
    .join('\n\n---\n\n');

  const sourceText = digestData.sourceArticleUrl
    ? `\n\nSource article: ${digestData.sourceArticleName ? `${digestData.sourceArticleName} - ` : ''}${digestData.sourceArticleUrl}`
    : '';

  const transcriptText = digestData.voiceoverTranscript
    ? `\n\nVoiceover Transcript:\n${digestData.voiceoverTranscript}`
    : '';

  return sendEmail({
    to,
    subject: `Social Media Assets Ready: ${digestData.blogTitle}`,
    html: emailHtml,
    text: `Social Media Assets Ready: ${digestData.blogTitle}${sourceText}${transcriptText}\n\nAssets:\n- Image: ${digestData.imageUrl}\n- Video: ${digestData.videoUrl}\n\nCaptions:\n\n${captionsText}\n\nView blog post: ${digestData.blogUrl}`,
  });
};

export type NewsVideoSkippedDiagnostics = {
  searchPrompt: string;
  rawResultPreview: string;
  articlesFound: {
    url: string;
    source: string;
    headline: string;
    category: string;
  }[];
  filteredOutStale: { headline: string; publishedDate: string }[];
  filteredOutDuplicate: { headline: string; url: string }[];
  filteredOutSemantic: {
    headline: string;
    url: string;
    matchedExisting: string;
  }[];
  skipReason: string | null;
};

export const sendNewsVideoSkipped = async (
  to: string,
  data: { checkedAt: string; diagnostics?: NewsVideoSkippedDiagnostics },
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const emailHtml = await render(
    NewsVideoSkippedEmail({
      checkedAt: data.checkedAt,
      diagnostics: data.diagnostics,
    }),
  );

  const diagText = data.diagnostics
    ? `\n\nSkip reason: ${data.diagnostics.skipReason || 'Unknown'}\nArticles found: ${data.diagnostics.articlesFound.length}\nFiltered (stale): ${data.diagnostics.filteredOutStale.length}\nFiltered (URL duplicate): ${data.diagnostics.filteredOutDuplicate.length}\nFiltered (same story): ${data.diagnostics.filteredOutSemantic.length}\n\nArticles found:\n${data.diagnostics.articlesFound.map((a) => `- [${a.source}] ${a.headline}`).join('\n') || 'None'}${data.diagnostics.filteredOutSemantic.length > 0 ? `\n\nSame story matches:\n${data.diagnostics.filteredOutSemantic.map((a) => `- "${a.headline}" ← matches → "${a.matchedExisting}"`).join('\n')}` : ''}\n\nPerplexity raw preview:\n${data.diagnostics.rawResultPreview.slice(0, 500)}`
    : '';

  return sendEmail({
    to,
    subject: `News Video Pipeline: ${data.diagnostics?.skipReason || 'No new articles found'}`,
    html: emailHtml,
    text: `News Video Pipeline: No new articles found\n\nThe news video pipeline ran but didn't find any new articles to create a video from.\n\nChecked at: ${data.checkedAt}${diagText}`,
  });
};

export const sendNewsVideoFailed = async (
  to: string,
  data: {
    failedAt: string;
    errorMessage: string;
    videoId?: string;
    headline?: string;
    stage?: string;
  },
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const emailHtml = await render(
    NewsVideoFailedEmail({
      failedAt: data.failedAt,
      errorMessage: data.errorMessage,
      videoId: data.videoId,
      headline: data.headline,
      stage: data.stage,
    }),
  );

  return sendEmail({
    to,
    subject: `News Video Pipeline FAILED: ${data.errorMessage.slice(0, 60)}`,
    html: emailHtml,
    text: `News Video Pipeline FAILED\n\nThe pipeline encountered an error:\n${data.errorMessage}\n\n${data.headline ? `Article: ${data.headline}\n` : ''}${data.videoId ? `Video ID: ${data.videoId}\n` : ''}${data.stage ? `Stage: ${data.stage}\n` : ''}\nFailed at: ${data.failedAt}`,
  });
};

export const sendWelcomeEmail = async (
  to: string,
  data: { name?: string },
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const emailHtml = await render(WelcomeEmail({ name: data.name }));

  return sendEmail({
    to,
    subject: 'Welcome to Parking Ticket Pal',
    html: emailHtml,
    text: `Welcome to Parking Ticket Pal!\n\nHi ${data.name || 'there'},\n\nYou're all set! Here's how Parking Ticket Pal helps you fight unfair parking tickets:\n\n- Scan or upload your parking ticket\n- Get an AI-powered Success Score\n- Generate appeal letters in minutes\n\nUpload your first ticket: ${process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com'}/new\n\nNeed help? Reply to this email or visit our support page.`,
  });
};

// Onboarding email data types per step
export type OnboardingStep1Data = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  numberOfCases: number;
  ticketId: string;
};

export type OnboardingStep2Data = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  ticketId: string;
  discountAmount: string;
  fullAmount: string;
  discountDeadline: string;
  daysUntilDiscount: number;
};

export type OnboardingStep3Data = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  ticketId: string;
  issuerAllowedCount: number;
  issuerTotalCases: number;
};

export type OnboardingStep4Data = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  ticketId: string;
  fullAmount: string;
};

export type OnboardingStep5Data = {
  name?: string;
  pcnNumber: string;
  ticketId: string;
  discountAmount: string;
  fullAmount: string;
  daysUntilDiscount: number;
};

export type OnboardingStep6Data = {
  name?: string;
  pcnNumber: string;
  ticketId: string;
  discountAmount: string;
  fullAmount: string;
  deadlineDate: string;
};

export type OnboardingEmailData =
  | { step: 1; data: OnboardingStep1Data }
  | { step: 2; data: OnboardingStep2Data }
  | { step: 3; data: OnboardingStep3Data }
  | { step: 4; data: OnboardingStep4Data }
  | { step: 5; data: OnboardingStep5Data }
  | { step: 6; data: OnboardingStep6Data };

// eslint-disable-next-line consistent-return
const getOnboardingSubject = (email: OnboardingEmailData): string => {
  // eslint-disable-next-line default-case
  switch (email.step) {
    case 1:
      return `Your ticket ${email.data.pcnNumber} — we found something`;
    case 2:
      return `${email.data.daysUntilDiscount} days before your fine doubles`;
    case 3:
      return `Tickets like yours — what the data shows`;
    case 4:
      return `Challenge your ticket in under 3 minutes`;
    case 5:
      return `£2.99 vs £${email.data.fullAmount} — simple maths`;
    case 6:
      return `Last chance — your fine doubles on ${email.data.deadlineDate}`;
  }
};

/* eslint-disable consistent-return, default-case */
const renderOnboardingTemplate = (
  email: OnboardingEmailData,
): Promise<string> => {
  switch (email.step) {
    case 1:
      return render(OnboardingQuickWinEmail(email.data));
    case 2:
      return render(OnboardingDeadlineEmail(email.data));
    case 3:
      return render(OnboardingSocialProofEmail(email.data));
    case 4:
      return render(OnboardingHowItWorksEmail(email.data));
    case 5:
      return render(OnboardingMathsEmail(email.data));
    case 6:
      return render(OnboardingFinalWarningEmail(email.data));
  }
};
/* eslint-enable consistent-return, default-case */

export const sendOnboardingEmail = async (
  to: string,
  email: OnboardingEmailData,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const subject = getOnboardingSubject(email);
  const emailHtml = await renderOnboardingTemplate(email);

  return sendEmail({
    to,
    subject,
    html: emailHtml,
  });
};
