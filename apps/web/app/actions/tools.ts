'use server';

import {
  getMOTHistory,
  getVehicleDetails,
  getFullVehicleInfo,
  type MOTHistoryResponse,
  type VehicleDetailsResponse,
} from '@/lib/dvla';
import { addToolsContact, type ToolCategory } from '@/lib/resend';
import { sendEmail } from '@/lib/email';
import { render } from '@react-email/render';
import generateFreeLetterPDF from '@/utils/generateFreeLetterPDF';
import FreeTemplateEmail from '@/emails/FreeTemplateEmail';
import type { TemplateCategory } from '@/data/templates';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'tools' });

/**
 * Server action to fetch MOT history for a vehicle
 */
export async function fetchMOTHistory(
  registration: string,
): Promise<MOTHistoryResponse> {
  return getMOTHistory(registration);
}

/**
 * Server action to fetch vehicle details
 */
export async function fetchVehicleDetails(
  registration: string,
): Promise<VehicleDetailsResponse> {
  return getVehicleDetails(registration);
}

/**
 * Server action to fetch both MOT history and vehicle details
 */
export async function fetchFullVehicleInfo(registration: string): Promise<{
  mot: MOTHistoryResponse;
  vehicle: VehicleDetailsResponse;
}> {
  return getFullVehicleInfo(registration);
}

/**
 * Server action to capture email for free tools lead generation
 */
export async function captureToolsEmail(
  email: string,
  firstName: string,
  toolCategory: ToolCategory,
): Promise<{ success: boolean; error?: string }> {
  try {
    await addToolsContact(email, firstName, toolCategory);
    return { success: true };
  } catch (error) {
    log.error(
      'Failed to capture tools email',
      undefined,
      error instanceof Error ? error : undefined,
    );
    // Don't fail the download if email capture fails
    return { success: true };
  }
}

/**
 * Server action to generate a PDF letter and email it to the user
 */
export async function sendFreeLetterEmail(
  email: string,
  firstName: string,
  letterContent: string,
  templateTitle: string,
  templateCategory: TemplateCategory,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Map template category to tool category for audience tracking
    const toolCategoryMap: Record<TemplateCategory, ToolCategory> = {
      parking: 'parking-templates',
      bailiff: 'bailiff-templates',
      motoring: 'motoring-templates',
    };

    // 1. Add to Resend free tools segment (don't fail if this errors)
    try {
      await addToolsContact(
        email,
        firstName,
        toolCategoryMap[templateCategory],
      );
    } catch (e) {
      log.error(
        'Failed to add contact to segment',
        undefined,
        e instanceof Error ? e : undefined,
      );
    }

    // 2. Generate PDF
    const pdfBuffer = await generateFreeLetterPDF(letterContent, templateTitle);

    // 3. Render email HTML
    const emailHtml = await render(
      FreeTemplateEmail({
        firstName,
        templateTitle,
        templateCategory,
      }),
    );

    // 4. Send email with PDF attachment using the unified email utility
    // This uses Mailtrap in development and Resend in production
    const result = await sendEmail({
      to: email,
      subject: `Your ${templateTitle} is ready`,
      html: emailHtml,
      attachments: [
        {
          filename: `${templateTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    return { success: true };
  } catch (error) {
    log.error(
      'Failed to send free letter email',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
