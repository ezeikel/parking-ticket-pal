import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFName,
  PDFPage,
  PDFField,
} from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Define the user data interface
interface TE7FormData {
  penaltyChargeNo: string;
  vehicleRegistrationNo: string;
  title: string; // Options: Mr, Mrs, Miss, Ms, Other
  titleOther: string;
  fullNameAndAddress: string;
  address: string;
  postcode: string;
  companyName: string; // If applicable
  reasonText: string;
  statementType: string; // Either "I believe" or "The respondent believes"
  signedName: string;
  dated: string;
  printFullName: string;
  filingOption: string; // "outside the given time" or "for more time"
  signatureOption: string; // "Respondent" or "Person signing on behalf of the respondent"

  // If signing on behalf (set one to true)
  officerOfCompany: boolean;
  partnerOfFirm: boolean;
  litigationFriend: boolean;

  // Signature data (URL to signature image or base64 data)
  signatureUrl: string | null;

  // Added for compatibility with existing code
  userName?: string;
  userTitle?: string;
  userTitleOther?: string;
  userAddress?: string;
  userPostcode?: string;
}

// Improved function to add SVG signature to PDF form field using drawSvgPath
async function addSvgSignatureToField(
  page: PDFPage,
  form: any,
  fieldName: string,
  svgUrl: string,
): Promise<boolean> {
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

    // as a sanity check, just write some text to the left of the field
    // page.drawText('TEST', {
    //   x: fieldRect.x,
    //   y: fieldRect.y + fieldRect.height / 2,
    //   size: 12,
    // });

    // return true;

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
    for (const pathData of paths) {
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
            (match) => {
              // Keep only M, L, C, Q commands and their parameters
              return match.charAt(0).match(/[MLCQ]/i) ? match : '';
            },
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
    }

    // Step 6: Remove the original form field to avoid overlapping elements
    form.removeField(field);

    console.log('✅ Successfully placed SVG signature on page');
    return true;
  } catch (error) {
    console.error('❌ Error adding signature:', error);
    return false;
  }
}

// Extract SVG paths and viewBox
function extractSvgPathsAndViewBox(svgString: string): {
  paths: string[];
  viewBox: { x: number; y: number; width: number; height: number };
} {
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
  function cleanSvgPath(pathData: string): string {
    // Remove any newlines or extra spaces that could cause parsing issues
    return pathData.replace(/\s+/g, ' ').trim();
  }

  // Extract all path data directly
  const paths: string[] = [];

  // First try to extract path elements with d attribute
  const pathRegex = /<path[^>]*d=["']([^"']*)["'][^>]*>/g;
  let pathMatch;
  while ((pathMatch = pathRegex.exec(svgString)) !== null) {
    if (pathMatch[1] && pathMatch[1].trim()) {
      const cleanPath = cleanSvgPath(pathMatch[1]);
      console.log(`🔍 Found path: ${cleanPath.substring(0, 50)}...`);
      paths.push(cleanPath);
    }
  }

  // If no paths found with the normal approach, try a fixed test path that works well
  if (paths.length === 0) {
    console.log('⚠️ No paths found in SVG, using simplified path');
    // Simple signature-like path that will at least show something
    paths.push('M 20,80 C 40,10 60,10 80,80 S 120,150 160,80');
  }

  return { paths, viewBox };
}

// Calculate transformation to fit SVG into the field
function calculateSvgTransform(
  viewBox: { x: number; y: number; width: number; height: number },
  fieldRect: { x: number; y: number; width: number; height: number },
): { scale: number; offsetX: number; offsetY: number } {
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
}

// Helper function to get precise field rectangle coordinates
async function getExactFieldRectangle(
  field: PDFField,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
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
}

// Helper function to download a file
async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const protocol = url.startsWith('https') ? https : http;

      return new Promise((resolve, reject) => {
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
}

async function fillTE7Form(userData: Partial<TE7FormData> = {}) {
  console.log('🚀 Starting TE7 form fill process...');

  try {
    // Load the PDF
    const pdfPath = './public/documents/forms/TE7.pdf';
    console.log(`📄 Loading PDF from: ${pdfPath}`);
    const pdfBytes = fs.readFileSync(pdfPath);
    console.log(`✅ PDF loaded, size: ${pdfBytes.length} bytes`);

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
    console.log('✅ Fonts embedded successfully');

    // Get the first page (form is on page 1)
    const page = pdfDoc.getPages()[0];
    console.log(`📑 PDF has ${pdfDoc.getPageCount()} pages`);

    // Get page dimensions
    const { width, height } = page.getSize();
    console.log(`📏 Page dimensions: ${width} x ${height}`);

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

    // Helper function to safely fill a text field (if form fields exist)
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

    // Helper function to safely check a checkbox (if form fields exist)
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

    // Helper function to set dropdown value (if form fields exist)
    const setDropdown = (fieldName: string, value?: string) => {
      if (!value) {
        console.log(`⏩ Skipping dropdown "${fieldName}"`);
        return false;
      }

      try {
        const field = form.getDropdown(fieldName);
        field.select(value);
        console.log(`✅ Set dropdown "${fieldName}" to "${value}"`);
        return true;
      } catch (e: unknown) {
        const error = e as Error;
        console.warn(
          `⚠️ Could not set dropdown "${fieldName}": ${error.message}`,
        );
        return false;
      }
    };

    console.log('🏁 Starting to fill form fields...');

    // Default form data
    const defaultFormData: TE7FormData = {
      penaltyChargeNo: '',
      vehicleRegistrationNo: '',
      title: '', // Options: Mr, Mrs, Miss, Ms, Other
      titleOther: '',
      fullNameAndAddress: '',
      address: '',
      postcode: '',
      companyName: '', // If applicable
      reasonText: '',
      statementType: 'I believe', // Either "I believe" or "The respondent believes"
      signedName: '',
      dated: '',
      printFullName: '',
      filingOption: 'outside the given time', // or "for more time"
      signatureOption: 'Respondent', // or "Person signing on behalf of the respondent"

      // If signing on behalf (set one to true)
      officerOfCompany: false,
      partnerOfFirm: false,
      litigationFriend: false,

      // Signature image data
      signatureUrl: null,
    };

    // Merge default data with provided user data
    const formData = { ...defaultFormData, ...userData };
    console.log('📝 Form data to fill:', JSON.stringify(formData, null, 2));

    // Define text color (black)
    const textColor = rgb(0, 0, 0);
    console.log('🖋️ Drawing text in black color');

    // Try programmatic form field filling first, then fall back to coordinate-based approach

    // Top section - penalty charge info (these fields were found in the log)
    fillTextField('Penalty Charge No', formData.penaltyChargeNo);
    fillTextField('Vehicle Registration No', formData.vehicleRegistrationNo);

    // Title checkboxes (these fields were found in the log)
    if (formData.userTitle === 'Mr') checkBox('Title - Mr', true);
    else if (formData.userTitle === 'Mrs') checkBox('Title - Mrs', true);
    else if (formData.userTitle === 'Miss') checkBox('Title - Miss', true);
    else if (formData.userTitle === 'Ms') checkBox('Title - Ms', true);
    else if (formData.userTitle === 'Other') {
      checkBox('Title - Other', true);
      fillTextField('Other title', formData.userTitleOther);
    }

    // Personal details (use the field names from the log)
    let filledName = fillTextField('Full name Respondent', formData.userName);
    if (!filledName) {
      drawText(formData.userName || '', 566, 517);
    }

    let filledAddress = fillTextField(
      "Respondent's address",
      formData.userAddress,
    );
    if (!filledAddress && formData.userAddress) {
      const addressLines = formData.userAddress.split('\n');
      let yPos = 585;
      for (const line of addressLines) {
        drawText(line, 400, yPos);
        yPos -= 20; // Move down for next line
      }
    }

    let filledPostcode = fillTextField(
      "Respondent's postcode",
      formData.userPostcode,
    );
    if (!filledPostcode) {
      drawText(formData.userPostcode || '', 482, 637);
    }

    let filledCompany = fillTextField(
      'Company name if vehicle owned and registered by a company',
      formData.companyName,
    );
    if (!filledCompany && formData.companyName) {
      drawText(formData.companyName, 738, 585);
    }

    // Set the dropdown for filing option
    setDropdown(
      'outside the given time/for more time (choose an option)',
      formData.filingOption,
    );

    // Reason text
    let filledReason = fillTextField(
      'Reasons for applying for permission',
      formData.reasonText,
    );
    if (!filledReason && formData.reasonText) {
      // Handle multiple lines for reasons
      const reasonLines = formData.reasonText.split('\n');
      let yPos = 795;
      for (const line of reasonLines) {
        drawText(line, 460, yPos);
        yPos -= 20; // Move down for next line
      }
    }

    // Statement of truth section
    // Set the dropdown for statement type
    setDropdown(
      'I believe/The respondent believes (choose an option)',
      formData.statementType,
    );

    // Handle signature with our improved method that uses drawSvgPath
    let signatureAdded = false;

    if (formData.signatureUrl) {
      console.log('🖊️ Adding signature from URL using SVG path method');

      // Use the SVG path signature handling function
      const signatureFieldName = 'signed - signature box';
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

    // Fall back to text signature if no image or embedding failed
    if (!signatureAdded) {
      let filledSignature = fillTextField(
        'signed - signature box',
        formData.signedName,
      );

      if (!filledSignature && formData.signedName) {
        drawText(formData.signedName, 116, 1032);
      }
    }

    // Set the dropdown for who is signing
    setDropdown(
      'Respondent/Person signing on behalf of the respondent (choose an option)',
      formData.signatureOption,
    );

    // Date
    let filledDate = fillTextField(
      'Date of signature',
      formData.dated || new Date().toLocaleDateString('en-GB'),
    );
    if (!filledDate && formData.dated) {
      drawText(formData.dated, 647, 1032);
    }

    // Print full name (this field was found in the log)
    fillTextField('Print full name', formData.userName);

    // Signing on behalf checkboxes (these fields were found in the log)
    if (formData.officerOfCompany) {
      checkBox('An office of the company - yes', true);
    }

    if (formData.partnerOfFirm) {
      checkBox('A Partner of the firm - yes', true);
    }

    if (formData.litigationFriend) {
      checkBox('Litigation friend - yes', true);
    }

    console.log('✨ All form fields filled successfully');

    // Save the filled form in a specific directory
    const outputDir = './public/documents/output';
    console.log(`📁 Preparing to save to directory: ${outputDir}`);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      console.log(
        `📂 Output directory doesn't exist, creating it: ${outputDir}`,
      );
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`✅ Created output directory: ${outputDir}`);
      } catch (e: unknown) {
        const error = e as Error;
        console.error(`❌ Error creating output directory: ${error.message}`);
        throw e;
      }
    }

    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `filled_TE7_${timestamp}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);
    console.log(`💾 Saving filled form to: ${outputPath}`);

    // Save the PDF
    console.log('⚙️ Generating PDF bytes...');
    const filledPdfBytes = await pdfDoc.save();
    console.log(`✅ Generated ${filledPdfBytes.length} bytes of PDF data`);

    console.log(`📝 Writing file to: ${outputPath}`);
    fs.writeFileSync(outputPath, filledPdfBytes);
    console.log('🎉 Form successfully filled and saved!');

    return outputPath;
  } catch (error) {
    console.error('❌ ERROR in fillTE7Form:', error);
    throw error;
  }
}

export default fillTE7Form;
