import { PDFDocument } from 'pdf-lib';
import { headers } from 'next/headers';

/**
 * Fills the PE2 form using only available form fields from the PDF
 * Uses appropriate font size to match other forms
 * @param {Object} userData - User data to fill in the form
 * @returns {Promise<string>} - Path to the filled form
 */
const fillPE2Form = async (userData: Record<string, any> = {}): Promise<Uint8Array> => {
  console.log('🚀 Starting PE2 form fill process...');

  try {
    // Fetch PDF from public URL using Next.js headers
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const pdfUrl = `${protocol}://${host}/documents/forms/PE2.pdf`;
    console.log(`📄 Loading PDF from: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    const pdfBytes = await pdfResponse.arrayBuffer();
    console.log(`✅ PDF loaded, size: ${pdfBytes.byteLength} bytes`);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('✅ PDF document successfully parsed');

    // Get form fields and log them
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log(`🔍 Found ${fields.length} form fields:`);

    // Log all field names and types for reference
    const fieldNames: string[] = [];
    fields.forEach((field) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      console.log(`- ${fieldName} (${fieldType})`);
      fieldNames.push(fieldName);
    });

    // default form data
    const defaultFormData = {
      penaltyChargeNo: '',
      vehicleRegistrationNo: '',
      applicant: '',
      locationOfContravention: '',
      dateOfContravention: '',
      fullNameAndAddress: '',
      reasonText: '',
    };

    // merge default data with provided user data
    const formData = { ...defaultFormData, ...userData };
    console.log('📝 Form data to fill:', JSON.stringify(formData, null, 2));

    console.log('🏁 Starting to fill form fields!...');

    // helper function to safely fill a text field with custom font size
    const fillTextField = (fieldName: string, value: string) => {
      if (!value) {
        console.log(`⏩ Skipping empty field "${fieldName}"`);
        return false;
      }

      // Only try to fill fields that actually exist
      if (!fieldNames.includes(fieldName)) {
        console.log(
          `ℹ️ Field "${fieldName}" does not exist in the PDF, skipping`,
        );
        return false;
      }

      try {
        const field = form.getTextField(fieldName);

        // Adjust font size to match TE9 script (12pt)
        field.setFontSize(11); // Set a slightly smaller font size for better appearance
        field.setText(value.toUpperCase()); // form must be in BLOCK CAPITALS

        console.log(`✅ Filled text field "${fieldName}" with "${value}"`);
        return true;
      } catch (e: any) {
        console.warn(`⚠️ Could not fill field "${fieldName}": ${e.message}`);
        return false;
      }
    };

    // fill only the fields that we know exist in the PDF with adjusted font size
    if (fieldNames.includes('Penalty Charge Number')) {
      fillTextField('Penalty Charge Number', formData.penaltyChargeNo);
    }

    if (fieldNames.includes('Vehicle Registration Number')) {
      fillTextField(
        'Vehicle Registration Number',
        formData.vehicleRegistrationNo,
      );
    }

    if (fieldNames.includes('Applicant')) {
      fillTextField('Applicant', formData.applicant);
    }

    if (fieldNames.includes('Location of Contravention')) {
      fillTextField(
        'Location of Contravention',
        formData.locationOfContravention,
      );
    }

    if (fieldNames.includes('Date of Contravention')) {
      fillTextField('Date of Contravention', formData.dateOfContravention);
    }

    if (
      fieldNames.includes(
        'Full name and address of the respondent including postcode',
      )
    ) {
      fillTextField(
        'Full name and address of the respondent including postcode',
        formData.fullNameAndAddress,
      );
    }

    if (fieldNames.includes('Reasons for filing')) {
      fillTextField('Reasons for filing', formData.reasonText);
    }

    console.log('✨ Form filling completed');

    // Return PDF bytes instead of writing to filesystem
    const filledPdfBytes = await pdfDoc.save();
    console.log('🎉 Form successfully filled!');

    return filledPdfBytes;
  } catch (error) {
    console.error('❌ ERROR in fillPE2Form:', error);
    throw error;
  }
};

export default fillPE2Form;
