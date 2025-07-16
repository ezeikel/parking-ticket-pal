import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

/**
 * Generates explanation text for PE3 form based on checked checkboxes
 * @param {Object} formData - Form data with checkbox states
 * @returns {string} - Generated explanation text
 */
const generatePE3Explanation = (formData: Record<string, any>): string => {
  const explanations: string[] = [];

  if (formData.didNotReceiveNotice) {
    explanations.push(
      'I did not receive the Notice to Owner or any subsequent correspondence until the Order for Recovery arrived at my current address. I was unaware of the penalty charge until this late stage in the enforcement process.',
    );
  }

  if (formData.madeRepresentations) {
    explanations.push(
      'I made formal representations to the authority within the required timeframe but did not receive a response or rejection notice. My representations were submitted in good faith and I believe they had merit.',
    );
  }

  if (formData.appealedToAdjudicator) {
    explanations.push(
      'I appealed to the Parking/Traffic Adjudicator but my appeal was not determined or I did not receive a response. I believe my appeal had merit and should have been considered properly.',
    );
  }

  // If no specific checkboxes are checked, provide a generic explanation
  if (explanations.length === 0) {
    explanations.push(
      'I am making this statutory declaration to request that the enforcement process be reset due to exceptional circumstances that prevented me from responding to the penalty charge notice in a timely manner.',
    );
  }

  return explanations.join('\n\n');
};

/**
 * Fills the PE3 form using only available form fields from the PDF
 * Uses appropriate font size to match other forms
 * @param {Object} userData - User data to fill in the form
 * @returns {Promise<string>} - Path to the filled form
 */
const fillPE3Form = async (userData: Record<string, any> = {}) => {
  console.log('🚀 Starting PE3 form fill process...');

  try {
    // load the PDF
    const pdfPath = './public/documents/forms/PE3.pdf';
    console.log(`📄 Loading PDF from: ${pdfPath}`);

    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ PE3.pdf not found at ${pdfPath}`);
      console.log(
        '⚠️ The PE3.pdf file must be present in the public/documents/forms directory',
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
      didNotReceiveNotice: true, // TODO: hardcoding for now
      madeRepresentations: false,
      appealedToAdjudicator: false,
    };

    // merge default data with provided user data
    const formData = { ...defaultFormData, ...userData };

    // Generate explanation text based on checked checkboxes only if no reason text is provided
    if (!formData.reasonText) {
      formData.reasonText = generatePE3Explanation(formData);
    }

    console.log('📝 Form data to fill:', JSON.stringify(formData, null, 2));

    console.log('🏁 Starting to fill form fields...');

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

    // helper function to safely check a checkbox
    const checkBox = (fieldName: string, shouldCheck: boolean) => {
      if (!shouldCheck) {
        console.log(`⏩ Skipping checkbox "${fieldName}"`);
        return false;
      }

      // Only try to check fields that actually exist
      if (!fieldNames.includes(fieldName)) {
        console.log(
          `ℹ️ Checkbox "${fieldName}" does not exist in the PDF, skipping`,
        );
        return false;
      }

      try {
        const field = form.getCheckBox(fieldName);
        // show default check mark
        field.defaultUpdateAppearances();
        field.check();
        console.log(`✅ Checked checkbox "${fieldName}"`);
        return true;
      } catch (e: any) {
        console.warn(`⚠️ Could not check "${fieldName}": ${e.message}`);
        return false;
      }
    };

    // Fill only the fields that we know exist in the PDF with adjusted font size
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

    // checkboxes for the three options in PE3
    if (
      formData.didNotReceiveNotice &&
      fieldNames.includes('I did not receive the notice')
    ) {
      checkBox('I did not receive the notice', true);
    }

    if (
      formData.madeRepresentations &&
      fieldNames.includes('I made representations')
    ) {
      checkBox('I made representations', true);
    }

    if (
      formData.appealedToAdjudicator &&
      fieldNames.includes('I appealed to the Parking/Traffic Adjudicator')
    ) {
      checkBox('I appealed to the Parking/Traffic Adjudicator', true);
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

    const outputFilename = `PE3-${pcnNumber}-${formattedUserFullName}-${timestamp}.pdf`;
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
    console.error('❌ ERROR in fillPE3Form:', error);
    throw error;
  }
};

export default fillPE3Form;
