import path from 'path';
import fs from 'fs';
import fillPE2Form from '@/utils/automation/forms/PE2';
import fillPE3Form from '@/utils/automation/forms/PE3';
import fillTE7Form from '@/utils/automation/forms/TE7';
import fillTE9Form from '@/utils/automation/forms/TE9';
import FormEmail from '@/components/emails/FormEmail';
import { FormType } from '@prisma/client';
import { Address, PdfFormFields } from '@/types';
import { put } from '@vercel/blob';
import { STORAGE_PATHS } from '@/constants';
import { resend } from '@/lib/resend';
import { db } from '@/lib/prisma';

// generic function to fill a form and follow subsequent steps e.g. upload to blob, save to db, send email
const handleFormGeneration = async (
  formType: FormType,
  formFields: PdfFormFields,
  fillFormFn: (data: Record<string, any>) => Promise<string | null>,
) => {
  // TODO: make try/catches more granular
  try {
    // fill pdf form
    const filledFormPath = await fillFormFn(formFields);

    if (!filledFormPath) {
      return { success: false, error: `Failed to generate ${formType} form` };
    }

    // get file name and buffer
    const fileName = path.basename(filledFormPath);
    const fileBuffer = fs.readFileSync(filledFormPath);

    // upload to vercel blob with organised path structure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Format the user's name for the filename (lowercase and hyphenated)
    const userName = formFields.userName || 'unknown';
    const formattedUserName = userName.toLowerCase().replace(/\s+/g, '-');

    const blobPath = STORAGE_PATHS.USER_TICKET_FORM.replace(
      '%s',
      formFields.userId,
    )
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
      console.error('Error uploading form to blob:', error);
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
        from: 'Parking Ticket Pal <forms@parkingticketpal.com>',
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

    // clean up local file
    fs.unlinkSync(filledFormPath);

    return {
      success: true,
      fileUrl: blob.url,
      fileName,
      formId: form.id,
    };
  } catch (error) {
    console.error(`Error generating ${formType} form:`, error);
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
      console.error('Ticket not found');
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
      userName: user.name,
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
    console.error('Error getting form data from ticket:', error);
    return null;
  }
};
