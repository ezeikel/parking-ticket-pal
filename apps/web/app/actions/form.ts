'use server';

import fillPE2Form from '@/utils/automation/forms/PE2';
import fillPE3Form from '@/utils/automation/forms/PE3';
import fillTE7Form from '@/utils/automation/forms/TE7';
import fillTE9Form from '@/utils/automation/forms/TE9';
import FormEmail from '@/components/emails/FormEmail';
import { FormType } from '@prisma/client';
import { PdfFormFields } from '@/types';
import { Address } from '@parking-ticket-pal/types';
import { put } from '@vercel/blob';
import { STORAGE_PATHS } from '@/constants';
import resend from '@/lib/resend';
import { db } from '@/lib/prisma';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'form' });

// generic function to fill a form and follow subsequent steps e.g. upload to blob, save to db, send email
const handleFormGeneration = async (
  formType: FormType,
  formFields: PdfFormFields,
  fillFormFn: (data: Record<string, any>) => Promise<Uint8Array | null>,
) => {
  // TODO: make try/catches more granular
  try {
    // fill pdf form
    const filledFormBytes = await fillFormFn(formFields);

    if (!filledFormBytes) {
      return { success: false, error: `Failed to generate ${formType} form` };
    }

    // convert Uint8Array to Buffer for blob upload
    const fileBuffer = Buffer.from(filledFormBytes);
    const fileName = `${formType}_form.pdf`;

    // upload to vercel blob with organised path structure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Format the user's name for the filename (lowercase and hyphenated)
    const userName = formFields.userName || 'unknown';
    const formattedUserName = userName.toLowerCase().replace(/\s+/g, '-');

    const blobPath = STORAGE_PATHS.TICKET_FORM.replace('%s', formFields.userId)
      .replace('%s', formFields.ticketId)
      .replace('%s', formType)
      .replace('%s', formattedUserName)
      .replace('%s', formFields.penaltyChargeNo)
      .replace('%s', timestamp);

    let blob;

    try {
      blob = await put(blobPath, fileBuffer, {
        access: 'public',
        contentType: 'application/pdf',
      });
    } catch (error) {
      logger.error('Error uploading form to blob', {
        formType,
        ticketId: formFields.ticketId,
        userId: formFields.userId
      }, error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: `Error uploading ${formType} form pdf to blob storage`,
      };
    }

    // save to database
    const form = await db.form.create({
      data: {
        ticketId: formFields.ticketId,
        formType,
        fileName,
        fileUrl: blob.url,
      },
    });

    // send email if email is provided
    if (formFields.userEmail) {
      await resend.emails.send({
        from: `Parking Ticket Pal <${process.env.DEFAULT_FROM_EMAIL}>`,
        to: formFields.userEmail,
        subject: `Your ${formType} Form`,
        react: FormEmail({
          formType,
          userName: formFields.userName,
          downloadUrl: blob.url,
        }),
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
          },
        ],
      });
    }

    return {
      success: true,
      fileUrl: blob.url,
      fileName,
      formId: form.id,
    };
  } catch (error) {
    logger.error('Error generating form', {
      formType,
      ticketId: formFields.ticketId,
      userId: formFields.userId
    }, error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: `Error generating ${formType} form` };
  }
};

export const generatePE2Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.PE2, formFields, fillPE2Form);

export const generatePE3Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.PE3, formFields, fillPE3Form);

export const generateTE7Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.TE7, formFields, fillTE7Form);

export const generateTE9Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.TE9, formFields, fillTE9Form);

export const getFormFillDataFromTicket = async (
  pcnNumber: string,
  userId?: string,
): Promise<PdfFormFields | null> => {
  try {
    const ticket = await db.ticket.findUnique({
      where: { pcnNumber },
      include: {
        vehicle: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!ticket) {
      logger.error('Ticket not found for form generation', {
        pcnNumber
      });
      return null;
    }

    // Verify ticket belongs to the authenticated user (if userId provided)
    if (userId && ticket.vehicle.userId !== userId) {
      logger.error('Ticket does not belong to authenticated user', {
        ticketId: ticket.id,
        pcnNumber,
        userId,
        ticketOwnerId: ticket.vehicle.userId,
      });
      return null;
    }

    // Format the user's address
    const { user } = ticket.vehicle;
    const addressParts = [];

    if ((user.address as Address)?.line1)
      addressParts.push((user.address as Address).line1);
    if ((user.address as Address)?.line2)
      addressParts.push((user.address as Address).line2);
    if ((user.address as Address)?.city)
      addressParts.push((user.address as Address).city);
    if ((user.address as Address)?.postcode)
      addressParts.push((user.address as Address).postcode);
    if ((user.address as Address)?.county)
      addressParts.push((user.address as Address).county);
    if ((user.address as Address)?.country)
      addressParts.push((user.address as Address).country);

    const formattedAddress = addressParts.join('\n');

    // Format the full name and address
    const fullNameAndAddress = `${user.name}\n${formattedAddress}`;

    // Format the date of contravention
    const contraventionDate = new Date(ticket.contraventionAt);
    const formattedDate = `${contraventionDate.getDate().toString().padStart(2, '0')}/${(
      contraventionDate.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${contraventionDate.getFullYear()}`;

    return {
      userId: user.id,
      ticketId: ticket.id,
      userName: user.name ?? '', // we might not have a name if the user is signed in with Facebook/Apple/Resend
      userEmail: user.email,
      userAddress: formattedAddress,
      userPostcode: (user.address as Address)?.postcode,
      userTitle: 'Mr', // TODO: get title from user
      penaltyChargeNo: ticket.pcnNumber,
      vehicleRegistrationNo: ticket.vehicle.registrationNumber,
      applicant: ticket.issuer,
      locationOfContravention:
        typeof ticket.location === 'object' && ticket.location !== null
          ? ((ticket.location as Address).line1 || '') +
            ((ticket.location as Address).city
              ? `, ${(ticket.location as Address).city}`
              : '') +
            ((ticket.location as Address).postcode
              ? `, ${(ticket.location as Address).postcode}`
              : '')
          : String(ticket.location),
      dateOfContravention: formattedDate,
      fullNameAndAddress,
      reasonText: '', // This would need to be provided separately
      signatureUrl: user.signatureUrl || null,
    };
  } catch (error) {
    logger.error('Error getting form data from ticket', {
      pcnNumber
    }, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

/**
 * Get all forms for the authenticated user
 * Shared between web and API routes
 */
export const getForms = async (userId: string) => {
  try {
    const forms = await db.form.findMany({
      where: {
        ticket: {
          vehicle: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        ticket: {
          select: {
            pcnNumber: true,
          },
        },
      },
    });

    return { success: true, forms };
  } catch (error) {
    logger.error('Error getting forms', {
      userId
    }, error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: 'Failed to get forms', forms: [] };
  }
};
