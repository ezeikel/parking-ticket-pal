'use server';

import nodemailer from 'nodemailer';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { render } from '@react-email/render';
import resend from '@/lib/resend';
import MagicLinkEmail from '@/emails/MagicLinkEmail';
import TicketReminderEmail from '@/emails/TicketReminderEmail';
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
import WaitlistWelcomeEmail from '@/emails/waitlist/WaitlistWelcomeEmail';
import WaitlistValueEmail from '@/emails/waitlist/WaitlistValueEmail';
import WaitlistLaunchEmail from '@/emails/waitlist/WaitlistLaunchEmail';

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
  headers: z.record(z.string(), z.string()).optional(),
});

export type EmailAttachment = z.infer<typeof AttachmentSchema>;
export type EmailData = z.infer<typeof EmailSchema>;

const getFromAddress = (customFrom?: string): string => {
  if (customFrom) return customFrom;
  const defaultEmail = process.env.DEFAULT_FROM_EMAIL;
  if (defaultEmail) return `Parking Ticket Pal <${defaultEmail}>`;
  return 'Parking Ticket Pal <no-reply@notifications.parkingticketpal.com>';
};

const getMailtrapTransport = (): nodemailer.Transporter | null => {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.MAILTRAP_HOST &&
    process.env.MAILTRAP_PORT
  ) {
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: parseInt(process.env.MAILTRAP_PORT, 10),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }
  return null;
};

export const sendEmail = async (
  emailData: EmailData,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  try {
    const validatedData = EmailSchema.parse(emailData);
    const fromAddress = getFromAddress(validatedData.from);

    // Use Mailtrap in development if configured
    const mailtrap = getMailtrapTransport();
    if (mailtrap) {
      const result = await mailtrap.sendMail({
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
    }

    // Production: use Resend singleton
    const result = await resend.emails.send({
      to: validatedData.to,
      from: fromAddress,
      subject: validatedData.subject,
      html: validatedData.html,
      text: validatedData.text,
      replyTo: validatedData.replyTo,
      headers: validatedData.headers,
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
  // Use sequential sends for Mailtrap in development
  const mailtrap = getMailtrapTransport();
  if (mailtrap) {
    const results = await emails.reduce(
      async (accPromise, email) => {
        const acc = await accPromise;
        const result = await sendEmail(email);
        return [...acc, { ...result, recipient: email.to }];
      },
      Promise.resolve(
        [] as {
          success: boolean;
          messageId?: string;
          error?: string;
          recipient: string | string[];
        }[],
      ),
    );
    return {
      success: results.every((r) => r.success),
      results,
    };
  }

  // Production: use Resend batch API
  try {
    const batchPayload = emails.map((email) => {
      const validated = EmailSchema.parse(email);
      return {
        to: validated.to,
        from: getFromAddress(validated.from),
        subject: validated.subject,
        html: validated.html,
        text: validated.text,
        replyTo: validated.replyTo,
        headers: validated.headers,
        attachments: validated.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
        })),
      };
    });

    const { data, error } = await resend.batch.send(batchPayload);

    if (error) {
      throw new Error(error.message);
    }

    const results = (data?.data ?? []).map((item, index) => ({
      success: true,
      messageId: item.id,
      recipient: emails[index].to,
    }));

    return { success: true, results };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { service: 'email', action: 'send_batch' },
    });

    return {
      success: false,
      results: emails.map((email) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Batch send failed',
        recipient: email.to,
      })),
    };
  }
};

export const sendMagicLinkEmail = async (
  to: string,
  magicLink: string,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const props = { magicLink };
  const emailHtml = await render(MagicLinkEmail(props));
  const emailText = await render(MagicLinkEmail(props), { plainText: true });

  return sendEmail({
    to,
    subject: 'Sign in to Parking Ticket Pal',
    html: emailHtml,
    text: emailText,
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
  const props = {
    pcnNumber: ticketData.pcnNumber,
    dueDate: ticketData.dueDate,
    amount: ticketData.amount,
  };
  const emailHtml = await render(TicketReminderEmail(props));
  const emailText = await render(TicketReminderEmail(props), {
    plainText: true,
  });

  return sendEmail({
    to,
    subject: `Reminder: Parking Ticket ${ticketData.pcnNumber} Due Soon`,
    html: emailHtml,
    text: emailText,
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
  const props = {
    blogTitle: digestData.blogTitle,
    blogUrl: digestData.blogUrl,
    imageUrl: digestData.imageUrl,
    videoUrl: digestData.videoUrl,
    captions: digestData.captions,
    sourceArticleUrl: digestData.sourceArticleUrl,
    sourceArticleName: digestData.sourceArticleName,
    voiceoverTranscript: digestData.voiceoverTranscript,
  };
  const emailHtml = await render(SocialDigestEmail(props));
  const emailText = await render(SocialDigestEmail(props), { plainText: true });

  return sendEmail({
    to,
    subject: `Social Media Assets Ready: ${digestData.blogTitle}`,
    html: emailHtml,
    text: emailText,
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
  const props = {
    checkedAt: data.checkedAt,
    diagnostics: data.diagnostics,
  };
  const emailHtml = await render(NewsVideoSkippedEmail(props));
  const emailText = await render(NewsVideoSkippedEmail(props), {
    plainText: true,
  });

  return sendEmail({
    to,
    subject: `News Video Pipeline: ${data.diagnostics?.skipReason || 'No new articles found'}`,
    html: emailHtml,
    text: emailText,
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
  const props = {
    failedAt: data.failedAt,
    errorMessage: data.errorMessage,
    videoId: data.videoId,
    headline: data.headline,
    stage: data.stage,
  };
  const emailHtml = await render(NewsVideoFailedEmail(props));
  const emailText = await render(NewsVideoFailedEmail(props), {
    plainText: true,
  });

  return sendEmail({
    to,
    subject: `News Video Pipeline FAILED: ${data.errorMessage.slice(0, 60)}`,
    html: emailHtml,
    text: emailText,
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
  const props = { name: data.name };
  const emailHtml = await render(WelcomeEmail(props));
  const emailText = await render(WelcomeEmail(props), { plainText: true });

  return sendEmail({
    to,
    subject: 'Welcome to Parking Ticket Pal',
    html: emailHtml,
    text: emailText,
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
const getOnboardingElement = (
  email: OnboardingEmailData,
  unsubscribeUrl?: string,
) => {
  switch (email.step) {
    case 1:
      return OnboardingQuickWinEmail({ ...email.data, unsubscribeUrl });
    case 2:
      return OnboardingDeadlineEmail({ ...email.data, unsubscribeUrl });
    case 3:
      return OnboardingSocialProofEmail({ ...email.data, unsubscribeUrl });
    case 4:
      return OnboardingHowItWorksEmail({ ...email.data, unsubscribeUrl });
    case 5:
      return OnboardingMathsEmail({ ...email.data, unsubscribeUrl });
    case 6:
      return OnboardingFinalWarningEmail({ ...email.data, unsubscribeUrl });
  }
};
/* eslint-enable consistent-return, default-case */

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const getUnsubscribeUrl = (email: string): string =>
  `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

const getUnsubscribeHeaders = (
  unsubscribeUrl: string,
): Record<string, string> => ({
  'List-Unsubscribe': `<${unsubscribeUrl}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});

export const sendOnboardingEmail = async (
  to: string,
  email: OnboardingEmailData,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const subject = getOnboardingSubject(email);
  const unsubscribeUrl = getUnsubscribeUrl(to);
  const element = getOnboardingElement(email, unsubscribeUrl);
  const emailHtml = await render(element);
  const emailText = await render(element, { plainText: true });

  return sendEmail({
    to,
    subject,
    html: emailHtml,
    text: emailText,
    headers: getUnsubscribeHeaders(unsubscribeUrl),
  });
};

// ============================================================================
// Waitlist Emails
// ============================================================================

type WaitlistStep = 1 | 2 | 3;

const WAITLIST_SUBJECTS: Record<WaitlistStep, string> = {
  1: "You're on the list",
  2: "Most parking ticket appeals don't need a solicitor",
  3: 'The app is here — download now',
};

/* eslint-disable consistent-return, default-case */
const getWaitlistElement = (
  step: WaitlistStep,
  options?: {
    appStoreUrl?: string;
    playStoreUrl?: string;
    unsubscribeUrl?: string;
  },
) => {
  switch (step) {
    case 1:
      return WaitlistWelcomeEmail({
        unsubscribeUrl: options?.unsubscribeUrl,
      });
    case 2:
      return WaitlistValueEmail({ unsubscribeUrl: options?.unsubscribeUrl });
    case 3:
      return WaitlistLaunchEmail({
        appStoreUrl: options?.appStoreUrl,
        playStoreUrl: options?.playStoreUrl,
        unsubscribeUrl: options?.unsubscribeUrl,
      });
  }
};
/* eslint-enable consistent-return, default-case */

export const sendWaitlistEmail = async (
  to: string,
  step: WaitlistStep,
  options?: { appStoreUrl?: string; playStoreUrl?: string },
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  const subject = WAITLIST_SUBJECTS[step];
  const unsubscribeUrl = getUnsubscribeUrl(to);
  const element = getWaitlistElement(step, {
    ...options,
    unsubscribeUrl,
  });
  const emailHtml = await render(element);
  const emailText = await render(element, { plainText: true });

  return sendEmail({
    to,
    subject,
    html: emailHtml,
    text: emailText,
    headers: getUnsubscribeHeaders(unsubscribeUrl),
  });
};
