import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

/**
 * Fills the PE2 form using only available form fields from the PDF
 * Uses appropriate font size to match other forms
 * @param {Object} userData - User data to fill in the form
 * @returns {Promise<string>} - Path to the filled form
 */
const fillPE2Form = async (userData: Record<string, any> = {}) => {
  console.log('🚀 Starting PE2 form fill process...');

  try {
    // load the PDF
    const pdfPath = './public/documents/forms/PE2.pdf';
    console.log(`📄 Loading PDF from: ${pdfPath}`);

    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ PE2.pdf not found at ${pdfPath}`);
      console.log(
        '⚠️ The PE2.pdf file must be present in the public/documents/forms directory',
      );
      return null;
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    console.log(`✅ PDF loaded, size: ${pdfBytes.length} bytes`);

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

    // save the filled form
    const outputDir = './public/documents/output';
    console.log(`📁 Preparing to save to directory: ${outputDir}`);

    // create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      console.log(
        `📂 Output directory doesn't exist, creating it: ${outputDir}`,
      );
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`✅ Created output directory: ${outputDir}`);
      } catch (e) {
        console.error(`❌ Error creating output directory:`, e);
        throw e;
      }
    }

    // generate a unique filename with timestamp and user information
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pcnNumber = formData.penaltyChargeNo || 'noPCN';

    // format the user's full name for the filename (lowercase and hyphenated)
    const userFullName = userData.userName || 'unknown';
    const formattedUserFullName = userFullName
      .toLowerCase()
      .replace(/\s+/g, '-');

    const outputFilename = `PE2-${pcnNumber}-${formattedUserFullName}-${timestamp}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`💾 Saving filled form to: ${outputPath}`);

    // save the PDF
    console.log('⚙️ Generating PDF bytes...');
    const filledPdfBytes = await pdfDoc.save();
    console.log(`✅ Generated ${filledPdfBytes.length} bytes of PDF data`);

    console.log(`📝 Writing file to: ${outputPath}`);
    fs.writeFileSync(outputPath, filledPdfBytes);
    console.log('🎉 Form successfully filled and saved!');

    return outputPath;
  } catch (error) {
    console.error('❌ ERROR in fillPE2Form:', error);
    throw error;
  }
};

export default fillPE2Form;
