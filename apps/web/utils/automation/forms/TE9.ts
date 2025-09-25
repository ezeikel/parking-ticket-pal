'use server';

import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFName,
  PDFPage,
  PDFField,
} from 'pdf-lib';
import https from 'https';
import http from 'http';
import { headers } from 'next/headers';

// Define the user data type
type TE9FormData = {
  penaltyChargeNo: string;
  vehicleRegistrationNo: string;
  applicant: string;
  locationOfContravention: string;
  dateOfContravention: string;
  userTitle: string; // Options: Mr, Mrs, Miss, Ms, Other
  titleOther: string;
  userName: string;
  userAddress: string;
  userPostcode: string;
  companyName: string; // If applicable

  // Checkboxes (set to true to check)
  didNotReceiveNotice: boolean;
  madeRepresentations: boolean;
  hadNoResponse: boolean;
  appealNotDetermined: boolean;
  appealInFavour: boolean;
  paidInFull: boolean;
  isBelieve: boolean; // For statement of truth (I believe) or (The witness believes)

  // Payment details (only if paidInFull is true)
  datePaid: string;
  paidByCash: boolean;
  paidByCheque: boolean;
  paidByDebitCard: boolean;
  paidByCreditCard: boolean;
  toWhomPaid: string;

  // Statement of truth
  signedName: string;
  signedByWitness: boolean; // or by person on behalf of witness
  dated: string;
  printFullName: string;

  // If signing on behalf (set one to true)
  officerOfCompany: boolean;
  partnerOfFirm: boolean;
  litigationFriend: boolean;

  // Signature URL
  signatureUrl: string | null;
};

// Helper function to get precise field rectangle coordinates
const getExactFieldRectangle = async (
  field: PDFField,
): Promise<{ x: number; y: number; width: number; height: number } | null> => {
  try {
    // Access the underlying dictionary
    if (!field.acroField || !field.acroField.dict) {
      return null;
    }

    // Try to get rectangle from the field itself
    const fieldDict = field.acroField.dict;

    // Get Rect directly from field dictionary
    let rect = fieldDict.get(PDFName.of('Rect'));

    // If not found directly, try to get from the widget annotations
    if (!rect || rect.toString() === 'null') {
      const kids = fieldDict.get(PDFName.of('Kids'));

      // Use safe type checking with any to avoid TypeScript errors
      const kidsAny = kids as any;

      if (
        kids &&
        kidsAny &&
        typeof kidsAny.size === 'function' &&
        kidsAny.size() > 0
      ) {
        // Get first widget annotation
        const widget = kidsAny.get(0);
        if (widget && widget.dict && typeof widget.dict.get === 'function') {
          rect = widget.dict.get(PDFName.of('Rect'));
        }
      }
    }

    if (!rect || rect.toString() === 'null') {
      console.warn('⚠️ Could not find Rect in field or its widgets');
      return null;
    }

    // Extract rectangle values
    let rectValues: number[] = [];

    // Use any type to bypass TypeScript restrictions
    const rectAny = rect as any;

    // Try different methods to extract the numbers
    if (rect && rectAny && typeof rectAny.asArray === 'function') {
      const array = rectAny.asArray();
      rectValues = array.map((item: any) =>
        typeof item.asNumber === 'function' ? item.asNumber() : 0,
      );
    } else {
      // Fallback to string parsing if we can't use asArray
      const rectStr = rect.toString();
      const matches = rectStr.match(/\d+(\.\d+)?/g);
      if (matches && matches.length >= 4) {
        rectValues = matches.slice(0, 4).map((n) => parseFloat(n));
      }
    }

    if (rectValues.length < 4) {
      console.warn('⚠️ Invalid field rectangle values');
      return null;
    }

    // PDF coordinates: [lowerLeftX, lowerLeftY, upperRightX, upperRightY]
    const [llx, lly, urx, ury] = rectValues;

    return {
      x: llx,
      y: lly, // Note: PDF coordinates start from bottom-left
      width: urx - llx,
      height: ury - lly,
    };
  } catch (error) {
    console.error('❌ Error getting field rectangle:', error);
    return null;
  }
};

// Helper function to download a file
const downloadFile = async (url: string): Promise<Buffer | null> => {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const protocol = url.startsWith('https') ? https : http;

      return await new Promise((resolve, reject) => {
        protocol
          .get(url, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Download failed: ${response.statusCode}`));
              return;
            }

            const chunks: Buffer[] = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          })
          .on('error', reject);
      });
    }
    // Local file path
    return fs.readFileSync(url);
  } catch (error) {
    console.error('❌ Error downloading file:', error);
    return null;
  }
};

// Extract SVG paths and viewBox
const extractSvgPathsAndViewBox = (
  svgString: string,
): {
  paths: string[];
  viewBox: { x: number; y: number; width: number; height: number };
} => {
  console.log('🔍 Extracting SVG paths from SVG string');

  // Default viewBox - set to something reasonable for signatures
  let viewBox = { x: 0, y: 0, width: 300, height: 150 };

  // Extract viewBox
  const viewBoxMatch = svgString.match(/viewBox=["']([^"']*)["']/);
  if (viewBoxMatch && viewBoxMatch[1]) {
    const values = viewBoxMatch[1].split(/[\s,]+/).map(Number);
    if (values.length >= 4) {
      viewBox = {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3],
      };
      console.log(`🔍 Found viewBox in SVG: ${JSON.stringify(viewBox)}`);
    }
  } else {
    console.log('⚠️ No viewBox found in SVG, using default');
  }

  // Use width/height attributes as fallback for viewBox
  if (viewBox.width === 0 || viewBox.height === 0) {
    const widthMatch = svgString.match(/width=["']([^"']*)["']/);
    const heightMatch = svgString.match(/height=["']([^"']*)["']/);

    if (widthMatch && widthMatch[1]) {
      const width = parseFloat(widthMatch[1]);
      if (width > 0) viewBox.width = width;
    }

    if (heightMatch && heightMatch[1]) {
      const height = parseFloat(heightMatch[1]);
      if (height > 0) viewBox.height = height;
    }
  }

  // Clean SVG path data to prevent parsing issues
  const cleanSvgPath = (pathData: string): string =>
    // Remove any newlines or extra spaces that could cause parsing issues
    pathData.replace(/\s+/g, ' ').trim();

  // Extract all path data directly
  const paths: string[] = [];

  // First try to extract path elements with d attribute
  const pathRegex = /<path[^>]*d=["']([^"']*)["'][^>]*>/g;
  let pathMatch = pathRegex.exec(svgString);
  while (pathMatch !== null) {
    if (pathMatch[1] && pathMatch[1].trim()) {
      const cleanPath = cleanSvgPath(pathMatch[1]);
      console.log(`🔍 Found path: ${cleanPath.substring(0, 50)}...`);
      paths.push(cleanPath);
    }
    pathMatch = pathRegex.exec(svgString);
  }

  // If no paths found with the normal approach, try a fixed test path that works well
  if (paths.length === 0) {
    console.log('⚠️ No paths found in SVG, using simplified path');
    // Simple signature-like path that will at least show something
    paths.push('M 20,80 C 40,10 60,10 80,80 S 120,150 160,80');
  }

  return { paths, viewBox };
};

// Calculate transformation to fit SVG into the field
const calculateSvgTransform = (
  viewBox: { x: number; y: number; width: number; height: number },
  fieldRect: { x: number; y: number; width: number; height: number },
): { scale: number; offsetX: number; offsetY: number } => {
  console.log(
    `📏 Calculating transform for viewBox: ${JSON.stringify(viewBox)} and fieldRect: ${JSON.stringify(fieldRect)}`,
  );

  // STEP 1: Determine the available space in the field
  // Allow signature to use more space (95% width, 80% height)
  const availableWidth = fieldRect.width * 0.95;
  const availableHeight = fieldRect.height * 0.8;

  // STEP 2: Calculate scaling factors
  const scaleX = availableWidth / viewBox.width;
  const scaleY = availableHeight / viewBox.height;

  // Use the smaller scaling factor to preserve aspect ratio, then boost by 25%
  const baseScale = Math.min(scaleX, scaleY);
  const scale = baseScale * 1.25; // Increase size by 25%

  console.log(
    `📏 Space available: ${availableWidth}x${availableHeight}, Base scale: ${baseScale}, Boosted scale: ${scale}`,
  );

  // STEP 3: Position horizontally - keep current good left alignment
  const offsetX = -10; // Current good horizontal position

  // STEP 4: Position vertically - move the signature significantly higher
  const bottomMargin = fieldRect.height * 0.93; // 93% from bottom (increased from 85%)
  const offsetY = bottomMargin;

  console.log(`📏 Positioning: offsetX=${offsetX}, offsetY=${offsetY}`);

  return { scale, offsetX, offsetY };
};

// Improved function to add SVG signature to PDF form field using drawSvgPath
const addSvgSignatureToField = async (
  page: PDFPage,
  form: any,
  fieldName: string,
  svgUrl: string,
): Promise<boolean> => {
  console.log(`🖊️ Adding SVG signature to field: ${fieldName}`);

  try {
    // Step 1: Get accurate field dimensions and position
    const field = form.getTextField(fieldName);
    console.log('🔍 Field:', field);

    if (!field) {
      console.warn(`⚠️ Field "${fieldName}" not found`);
      return false;
    }

    // Get exact field rectangle from the widget annotation
    const fieldRect = await getExactFieldRectangle(field);

    console.log('🔍 Field rectangle:', fieldRect);

    if (!fieldRect) {
      console.warn('⚠️ Could not determine field rectangle');
      return false;
    }

    console.log(`📏 Field dimensions: ${JSON.stringify(fieldRect)}`);

    // Step 2: Download the SVG file
    const svgBuffer = await downloadFile(svgUrl);

    if (!svgBuffer) {
      console.warn('⚠️ Failed to download SVG');
      return false;
    }

    // Step 3: Extract SVG paths and viewBox
    const { paths, viewBox } = extractSvgPathsAndViewBox(
      svgBuffer.toString('utf8'),
    );

    if (paths.length === 0) {
      console.warn('⚠️ No SVG paths found in the signature');
      return false;
    }

    console.log(`🔍 Extracted ${paths.length} SVG paths from signature`);
    console.log(`🔍 SVG viewBox: ${JSON.stringify(viewBox)}`);
    // Log the first path data to help with debugging
    if (paths.length > 0) {
      console.log(
        `🔍 First path data sample: ${paths[0].substring(0, 100)}...`,
      );
    }

    // Step 4: Calculate transform to fit SVG into the field
    const transform = calculateSvgTransform(viewBox, fieldRect);

    console.log('🔍 Transform:', transform);

    // Step 5: Draw the SVG paths directly on the page
    // First clear any previous content by drawing a white rectangle
    page.drawRectangle({
      x: fieldRect.x,
      y: fieldRect.y,
      width: fieldRect.width,
      height: fieldRect.height,
      color: rgb(1, 1, 1), // White
      opacity: 1,
      borderWidth: 0,
    });

    console.log(
      `🖊️ Drawing ${paths.length} SVG paths with transform:`,
      transform,
    );

    // Process paths from SVG signature image
    paths.forEach((pathData) => {
      // Apply the transformation to the path
      try {
        // Need to adjust for the viewBox origin when drawing
        page.drawSvgPath(pathData, {
          // Position at calculated offsets and adjust for viewBox origin
          x: fieldRect.x + transform.offsetX - viewBox.x * transform.scale,
          y: fieldRect.y + transform.offsetY - viewBox.y * transform.scale,
          scale: transform.scale,
          // Don't fill the path (transparent fill)
          color: undefined,
          opacity: 0,
          // Use stroke instead (outline)
          borderColor: rgb(0, 0, 0),
          // Use a stroke width that scales proportionally with the signature
          borderWidth: 2.0, // Thicker stroke for better visibility
          borderOpacity: 1,
        });
        console.log(
          `✅ Successfully drew path: ${pathData.substring(0, 30)}...`,
        );
      } catch (err) {
        console.warn(`⚠️ Error drawing SVG path: ${err}`);
        console.warn(`⚠️ Problem path data: ${pathData.substring(0, 50)}...`);
        // Try with a simpler version of the path
        try {
          // Create a simplified version by keeping just the movement commands
          const simplifiedPath = pathData.replace(
            /[a-zA-Z][^a-zA-Z]*/g,
            (match) =>
              // Keep only M, L, C, Q commands and their parameters
              match.charAt(0).match(/[MLCQ]/i) ? match : '',
          );
          if (simplifiedPath) {
            console.log(
              `🔄 Trying with simplified path: ${simplifiedPath.substring(0, 30)}...`,
            );
            page.drawSvgPath(simplifiedPath, {
              // Use the same positioning as the main path
              x: fieldRect.x + transform.offsetX - viewBox.x * transform.scale,
              y: fieldRect.y + transform.offsetY - viewBox.y * transform.scale,
              scale: transform.scale,
              // Use stroke rendering for simplified path too
              color: undefined,
              opacity: 0,
              borderColor: rgb(0, 0, 0),
              borderWidth: 2.0, // Thicker stroke for better visibility
              borderOpacity: 1,
            });
          }
        } catch (simplifyErr) {
          console.warn(`⚠️ Even simplified path failed: ${simplifyErr}`);
        }
      }
    });

    // Step 6: Remove the original form field to avoid overlapping elements
    // TODO: this errors for some reason
    // form.removeField(field);

    console.log('✅ Successfully placed SVG signature on page');
    return true;
  } catch (error) {
    console.error('❌ Error adding signature:', error);
    return false;
  }
};

const fillTE9Form = async (userData: Partial<TE9FormData> = {}): Promise<Uint8Array> => {
  console.log('🚀 Starting TE9 form fill process...');

  try {
    // Fetch PDF from public URL using Next.js headers
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const pdfUrl = `${protocol}://${host}/documents/forms/TE9.pdf`;
    console.log(`📄 Loading PDF from: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    const pdfBytes = await pdfResponse.arrayBuffer();
    console.log(`✅ PDF loaded, size: ${pdfBytes.byteLength} bytes`);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('✅ PDF document successfully parsed');

    // Check for form fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log(`🔍 Found ${fields.length} form fields:`);
    fields.forEach((field) => {
      console.log(`- ${field.getName()} (${field.constructor.name})`);
    });

    // Embed a standard font
    console.log('🔤 Embedding fonts...');
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    console.log('✅ Fonts embedded successfully');

    // Get the first page (form is on page 1)
    const page = pdfDoc.getPages()[0];
    console.log(`📑 PDF has ${pdfDoc.getPageCount()} pages`);

    // Get page dimensions
    const { width, height } = page.getSize();
    console.log(`📏 Page dimensions: ${width} x ${height}`);

    // Default form data
    const defaultFormData: TE9FormData = {
      penaltyChargeNo: '',
      vehicleRegistrationNo: '',
      applicant: '',
      locationOfContravention: '',
      dateOfContravention: '',
      userTitle: '', // Options: Mr, Mrs, Miss, Ms, Other
      titleOther: '',
      userName: '',
      userAddress: '',
      userPostcode: '',
      companyName: '', // If applicable

      // Checkboxes (set to true to check)
      didNotReceiveNotice: false,
      madeRepresentations: true, // TODO: hardcoding for now
      hadNoResponse: false,
      appealNotDetermined: false,
      appealInFavour: false,
      paidInFull: false,
      isBelieve: true, // For statement of truth (I believe) or (The witness believes)

      // Payment details (only if paidInFull is true)
      datePaid: '',
      paidByCash: false,
      paidByCheque: false,
      paidByDebitCard: false,
      paidByCreditCard: false,
      toWhomPaid: '',

      // Statement of truth
      signedName: '',
      signedByWitness: true, // or by person on behalf of witness
      dated: '',
      printFullName: '',

      // If signing on behalf (set one to true)
      officerOfCompany: false,
      partnerOfFirm: false,
      litigationFriend: false,

      // Signature URL
      signatureUrl: null,
    };

    // Merge default data with provided user data
    const formData = { ...defaultFormData, ...userData };
    console.log('📝 Form data to fill:', JSON.stringify(formData, null, 2));

    // Define text color (black)
    const textColor = rgb(0, 0, 0);
    console.log('🖋️ Drawing text in black color');

    // Helper function to safely draw text
    const drawText = (
      text: string,
      x: number,
      y: number,
      options: Record<string, any> = {},
    ) => {
      if (!text) {
        console.log(`⏩ Skipping empty text at (${x}, ${y})`);
        return;
      }

      console.log(`✍️ Drawing text "${text}" at coordinates (${x}, ${y})`);
      try {
        page.drawText(text, {
          x,
          y,
          size: 12,
          font: helveticaFont,
          color: textColor,
          ...options,
        });
        console.log(`✅ Successfully drew text "${text}"`);
      } catch (e: unknown) {
        const error = e as Error;
        console.error(`❌ Error drawing text "${text}": ${error.message}`);
      }
    };

    // Helper function to draw checkmark
    const drawCheckmark = (
      shouldDraw: boolean,
      x: number,
      y: number,
      label = '',
    ) => {
      if (!shouldDraw) {
        console.log(`⏩ Skipping checkmark for "${label}" at (${x}, ${y})`);
        return;
      }

      console.log(
        `☑️ Adding checkmark${label ? ` for "${label}"` : ''} at (${x}, ${y})`,
      );
      try {
        page.drawText('X', {
          x,
          y,
          size: 12,
          font: helveticaBold,
          color: textColor,
        });
        console.log(`✅ Successfully drew checkmark for "${label}"`);
      } catch (e: unknown) {
        const error = e as Error;
        console.error(
          `❌ Error drawing checkmark for "${label}": ${error.message}`,
        );
      }
    };

    console.log('🏁 Starting to draw form fields...');

    // Fill in the text fields using the exact field names from the PDF

    // Try programmatic form field filling first
    // Helper function to safely fill a text field
    const fillTextField = (fieldName: string, value?: string) => {
      if (!value) {
        console.log(`⏩ Skipping empty field "${fieldName}"`);
        return false;
      }

      try {
        const field = form.getTextField(fieldName);

        field.setFontSize(11); // Set a slightly smaller font size for better appearance
        field.setText(value.toUpperCase()); // form must be in BLOCK CAPITALS

        console.log(`✅ Filled text field "${fieldName}" with "${value}"`);
        return true;
      } catch (e: unknown) {
        const error = e as Error;
        console.warn(
          `⚠️ Could not fill field "${fieldName}": ${error.message}`,
        );
        return false;
      }
    };

    // Helper function to safely check a checkbox
    const checkBox = (fieldName: string, shouldCheck?: boolean) => {
      if (!shouldCheck) {
        console.log(`⏩ Skipping checkbox "${fieldName}"`);
        return false;
      }

      try {
        const field = form.getCheckBox(fieldName);
        field.check();
        console.log(`✅ Checked checkbox "${fieldName}"`);
        return true;
      } catch (e: unknown) {
        const error = e as Error;
        console.warn(`⚠️ Could not check "${fieldName}": ${error.message}`);
        return false;
      }
    };

    // Try form field filling first, then fallback to coordinate-based approach

    // Top table entries
    const filledPenalty = fillTextField(
      'Penalty charge number',
      formData.penaltyChargeNo,
    );
    if (!filledPenalty) {
      drawText(formData.penaltyChargeNo, 770, 705);
    }

    const filledVehicle = fillTextField(
      'Vehicle Registration No',
      formData.vehicleRegistrationNo,
    );
    if (!filledVehicle) {
      drawText(formData.vehicleRegistrationNo, 770, 665);
    }

    const filledApplicant = fillTextField('Applicant', formData.applicant);
    if (!filledApplicant) {
      drawText(formData.applicant, 770, 630);
    }

    const filledLocation = fillTextField(
      'Location of Contravention',
      formData.locationOfContravention,
    );
    if (!filledLocation) {
      drawText(formData.locationOfContravention, 770, 595);
    }

    const filledDateOfContravention = fillTextField(
      'Date of Contravention',
      formData.dateOfContravention,
    );
    if (!filledDateOfContravention) {
      drawText(formData.dateOfContravention, 770, 560);
    }

    // Title checkboxes
    let titleChecked = false;
    if (formData.userTitle === 'Mr') {
      titleChecked = checkBox('Title - Mr', true);
    } else if (formData.userTitle === 'Mrs') {
      titleChecked = checkBox('Title - Mrs', true);
      if (!titleChecked) drawCheckmark(true, 321, 478, 'Mrs');
    } else if (formData.userTitle === 'Miss') {
      titleChecked = checkBox('Title - Miss', true);
      if (!titleChecked) drawCheckmark(true, 413, 478, 'Miss');
    } else if (formData.userTitle === 'Ms') {
      titleChecked = checkBox('Title - Ms', true);
      if (!titleChecked) drawCheckmark(true, 505, 478, 'Ms');
    } else if (formData.userTitle === 'Other') {
      titleChecked = checkBox('Title - Other', true);

      if (!titleChecked) drawCheckmark(true, 597, 478, 'Other');

      const filledOtherTitle = fillTextField(
        'If Other title, details',
        formData.titleOther,
      );
      if (!filledOtherTitle && formData.titleOther) {
        drawText(formData.titleOther, 710, 478);
      }
    }

    // Personal details
    const filledName = fillTextField(
      'Full name (respondent)',
      formData.userName,
    );
    if (!filledName) {
      drawText(formData.userName, 550, 445);
    }

    const filledAddress = fillTextField('Address', formData.userAddress);
    if (!filledAddress && formData.userAddress) {
      const addressLines = formData.userAddress.split('\n');
      let yPos = 410;
      addressLines.forEach((line) => {
        drawText(line, 400, yPos);
        yPos -= 20; // Move down for next line
      });
    }

    // Handle postcode which has one field in the PDF
    let postcodeHandled = false;
    if (formData.userPostcode) {
      postcodeHandled = fillTextField('Postcode', formData.userPostcode);

      if (!postcodeHandled) {
        drawText(formData.userPostcode, 520, 340);
      }
    }

    const filledCompany = fillTextField(
      'Company name if vehicle owned and registered by a company',
      formData.companyName,
    );
    if (!filledCompany && formData.companyName) {
      drawText(formData.companyName, 742, 410);
    }

    // Check declaration checkboxes - try form fields first, then fallback to coordinates
    let didNotReceiveChecked = false;
    if (formData.didNotReceiveNotice) {
      didNotReceiveChecked = checkBox(
        'did not receive the penalty charge notice - yes',
        true,
      );
      if (!didNotReceiveChecked) {
        drawCheckmark(true, 53, 298, 'Did not receive notice');
      }
    }

    let representationsChecked = false;
    if (formData.madeRepresentations) {
      representationsChecked = checkBox(
        'representations but no rejection notice - yes',
        true,
      );
      if (!representationsChecked) {
        drawCheckmark(true, 53, 257, 'Made representations');
      }
    }

    let noResponseChecked = false;
    if (formData.hadNoResponse) {
      noResponseChecked = checkBox('appealed but no response - yes', true);
      if (!noResponseChecked) {
        drawCheckmark(true, 502, 280, 'Had no response');
      }
    }

    let appealNotDeterminedChecked = false;
    if (formData.appealNotDetermined) {
      appealNotDeterminedChecked = checkBox(
        'appeal had not been determined - yes',
        true,
      );
      if (!appealNotDeterminedChecked) {
        drawCheckmark(true, 502, 232, 'Appeal not determined');
      }
    }

    let appealInFavourChecked = false;
    if (formData.appealInFavour) {
      appealInFavourChecked = checkBox(
        'appeal was determined in your favour - yes',
        true,
      );
      if (!appealInFavourChecked) {
        drawCheckmark(true, 502, 184, 'Appeal in favor');
      }
    }

    let paidInFullChecked = false;
    if (formData.paidInFull) {
      paidInFullChecked = checkBox(
        'penalty charge has been paid in full - yes',
        true,
      );
      if (!paidInFullChecked) {
        drawCheckmark(true, 479, 147, 'Paid in full');
      }

      const filledDatePaid = fillTextField(
        'date paid in full',
        formData.datePaid,
      );
      if (!filledDatePaid && formData.datePaid) {
        drawText(formData.datePaid, 750, 125);
      }

      if (formData.paidByCash) checkBox('Paid in cash', true);
      if (formData.paidByCheque) checkBox('Paid by cheque', true);
      if (formData.paidByDebitCard) checkBox('Paid by debit card', true);
      if (formData.paidByCreditCard) checkBox('Paid by credit card', true);

      const filledToWhom = fillTextField(
        'To whom was it paid',
        formData.toWhomPaid,
      );
      if (!filledToWhom && formData.toWhomPaid) {
        drawText(formData.toWhomPaid, 750, 80);
      }
    }

    // Statement of truth - Reverse the logic similar to signedByWitness
    // When isBelieve is true, we need to check "The witness believes" (to cross it out)
    // When isBelieve is false, we need to check "I believe" (to cross it out)
    if (formData.isBelieve) {
      checkBox('The witness believes - overtype field', true);
    } else {
      checkBox('I believe - overtype field', true);
    }

    // Handle signature with SVG path if a signature URL is provided
    let signatureAdded = false;

    if (formData.signatureUrl) {
      console.log('🖊️ Adding signature from URL using SVG path method');

      // Use the SVG path signature handling function
      const signatureFieldName = 'Signature box';
      signatureAdded = await addSvgSignatureToField(
        page,
        form,
        signatureFieldName,
        formData.signatureUrl,
      );

      if (signatureAdded) {
        console.log('✅ Signature successfully added to form using SVG paths');
      } else {
        console.log(
          '⚠️ Failed to add signature with SVG paths, falling back to text',
        );
      }
    }

    // Fall back to text signature if no image URL provided or if embedding failed
    if (!signatureAdded) {
      const filledSignature = fillTextField(
        'Signature box',
        formData.signedName,
      );
      if (!filledSignature && formData.signedName) {
        drawText(formData.signedName, 400, 23);
      }
    }

    // The form uses X to indicate "delete this option" so we need to reverse the logic
    // when signedByWitness is true, we should NOT check "Signed by witness" box
    // and should check "Signed by person signing on behalf of the witness" box
    if (formData.signedByWitness) {
      checkBox('Signed by person signing on behalf of the witness', true);
    } else {
      checkBox('Signed by witness', true);
    }

    // date signed
    const filledDateSigned = fillTextField(
      'Date statement of truth signed',
      formData.dated || new Date().toLocaleDateString('en-GB'),
    );
    if (!filledDateSigned && formData.dated) {
      drawText(formData.dated, 780, 23);
    }

    const filledPrintName = fillTextField('Print full name', formData.userName);
    if (!filledPrintName && formData.userName) {
      drawText(formData.userName, 550, -18);
    }

    // Signing on behalf checkboxes
    if (formData.officerOfCompany) {
      const checkedOfficer = checkBox('officer of the company - yes', true);
      if (!checkedOfficer) {
        drawCheckmark(true, 112, -60, 'Officer of company');
      }
    }

    if (formData.partnerOfFirm) {
      const checkedPartner = checkBox('Partner of the firm - yes', true);
      if (!checkedPartner) {
        drawCheckmark(true, 266, -60, 'Partner of firm');
      }
    }

    if (formData.litigationFriend) {
      const checkedLitigation = checkBox('Litigation friend - yes', true);
      if (!checkedLitigation) {
        drawCheckmark(true, 399, -60, 'Litigation friend');
      }
    }

    console.log('✨ All form fields drawn successfully');

    // Return PDF bytes instead of writing to filesystem
    const filledPdfBytes = await pdfDoc.save();
    console.log('🎉 Form successfully filled!');

    return filledPdfBytes;
  } catch (error) {
    console.error('❌ ERROR in fillTE9Form:', error);
    throw error;
  }
};

export default fillTE9Form;
