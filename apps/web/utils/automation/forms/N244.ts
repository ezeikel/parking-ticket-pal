import { PDFDocument, rgb, PDFName, PDFPage, PDFField } from 'pdf-lib';
import https from 'https';
import http from 'http';
import { headers } from 'next/headers';

type N244FormData = {
  // Applicant details
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  userPostcode?: string;

  // Case details
  applicant?: string; // Issuer/council name (claimant)
  penaltyChargeNo?: string;

  // Form content
  orderRequestText?: string; // Q3: What order are you asking the court to make?
  reasonText?: string; // Q10: Evidence in support

  // Signature
  signatureUrl?: string | null;

  // Compatibility fields
  userId?: string;
  ticketId?: string;
  userAddress?: string;
  fullNameAndAddress?: string;
};

// Calculate transformation to fit SVG into the field
const calculateSvgTransform = (
  viewBox: { x: number; y: number; width: number; height: number },
  fieldRect: { x: number; y: number; width: number; height: number },
): { scale: number; offsetX: number; offsetY: number } => {
  const availableWidth = fieldRect.width * 0.95;
  const availableHeight = fieldRect.height * 0.8;

  const scaleX = availableWidth / viewBox.width;
  const scaleY = availableHeight / viewBox.height;

  const baseScale = Math.min(scaleX, scaleY);
  const scale = baseScale * 1.25;

  const offsetX = -10;
  const bottomMargin = fieldRect.height * 0.93;
  const offsetY = bottomMargin;

  return { scale, offsetX, offsetY };
};

// Helper function to get precise field rectangle coordinates
const getExactFieldRectangle = async (
  field: PDFField,
): Promise<{ x: number; y: number; width: number; height: number } | null> => {
  try {
    if (!field.acroField || !field.acroField.dict) {
      return null;
    }

    const fieldDict = field.acroField.dict;
    let rect = fieldDict.get(PDFName.of('Rect'));

    if (!rect || rect.toString() === 'null') {
      const kids = fieldDict.get(PDFName.of('Kids'));
      const kidsAny = kids as any;

      if (
        kids &&
        kidsAny &&
        typeof kidsAny.size === 'function' &&
        kidsAny.size() > 0
      ) {
        const widget = kidsAny.get(0);
        if (widget && widget.dict && typeof widget.dict.get === 'function') {
          rect = widget.dict.get(PDFName.of('Rect'));
        }
      }
    }

    if (!rect || rect.toString() === 'null') {
      return null;
    }

    let rectValues: number[] = [];
    const rectAny = rect as any;

    if (rect && rectAny && typeof rectAny.asArray === 'function') {
      const array = rectAny.asArray();
      rectValues = array.map((item: any) =>
        typeof item.asNumber === 'function' ? item.asNumber() : 0,
      );
    } else {
      const rectStr = rect.toString();
      const matches = rectStr.match(/\d+(\.\d+)?/g);
      if (matches && matches.length >= 4) {
        rectValues = matches.slice(0, 4).map((n) => parseFloat(n));
      }
    }

    if (rectValues.length < 4) {
      return null;
    }

    const [llx, lly, urx, ury] = rectValues;

    return {
      x: llx,
      y: lly,
      width: urx - llx,
      height: ury - lly,
    };
  } catch {
    return null;
  }
};

// Helper function to download a file
const downloadFile = (url: string): Promise<Buffer | null> => {
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
    return Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
};

// Extract SVG paths and viewBox
const extractSvgPathsAndViewBox = (
  svgString: string,
): {
  paths: string[];
  viewBox: { x: number; y: number; width: number; height: number };
} => {
  let viewBox = { x: 0, y: 0, width: 300, height: 150 };

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
    }
  }

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

  const cleanSvgPath = (pathData: string): string =>
    pathData.replace(/\s+/g, ' ').trim();

  const paths: string[] = [];
  const pathRegex = /<path[^>]*d=["']([^"']*)["'][^>]*>/g;
  Array.from(svgString.matchAll(pathRegex)).forEach((pathMatch) => {
    if (pathMatch[1] && pathMatch[1].trim()) {
      paths.push(cleanSvgPath(pathMatch[1]));
    }
  });

  if (paths.length === 0) {
    paths.push('M 20,80 C 40,10 60,10 80,80 S 120,150 160,80');
  }

  return { paths, viewBox };
};

// Add SVG signature to PDF form field
const addSvgSignatureToField = async (
  page: PDFPage,
  form: any,
  fieldName: string,
  svgUrl: string,
): Promise<boolean> => {
  try {
    const field = form.getTextField(fieldName);
    if (!field) return false;

    const fieldRect = await getExactFieldRectangle(field);
    if (!fieldRect) return false;

    const svgBuffer = await downloadFile(svgUrl);
    if (!svgBuffer) return false;

    const { paths, viewBox } = extractSvgPathsAndViewBox(
      svgBuffer.toString('utf8'),
    );
    if (paths.length === 0) return false;

    const transform = calculateSvgTransform(viewBox, fieldRect);

    // Clear field area
    page.drawRectangle({
      x: fieldRect.x,
      y: fieldRect.y,
      width: fieldRect.width,
      height: fieldRect.height,
      color: rgb(1, 1, 1),
      opacity: 1,
      borderWidth: 0,
    });

    // Draw SVG paths
    paths.forEach((pathData) => {
      try {
        page.drawSvgPath(pathData, {
          x: fieldRect.x + transform.offsetX - viewBox.x * transform.scale,
          y: fieldRect.y + transform.offsetY - viewBox.y * transform.scale,
          scale: transform.scale,
          color: undefined,
          opacity: 0,
          borderColor: rgb(0, 0, 0),
          borderWidth: 2.0,
          borderOpacity: 1,
        });
      } catch {
        // Try simplified path
        try {
          const simplifiedPath = pathData.replace(
            /[a-zA-Z][^a-zA-Z]*/g,
            (match) => (match.charAt(0).match(/[MLCQ]/i) ? match : ''),
          );
          if (simplifiedPath) {
            page.drawSvgPath(simplifiedPath, {
              x: fieldRect.x + transform.offsetX - viewBox.x * transform.scale,
              y: fieldRect.y + transform.offsetY - viewBox.y * transform.scale,
              scale: transform.scale,
              color: undefined,
              opacity: 0,
              borderColor: rgb(0, 0, 0),
              borderWidth: 2.0,
              borderOpacity: 1,
            });
          }
        } catch {
          // Skip this path
        }
      }
    });

    // Clear the field text instead of removing (removing corrupts some PDFs)
    try {
      field.setText('');
    } catch {
      // Ignore if we can't clear
    }
    return true;
  } catch {
    return false;
  }
};

const fillN244Form = async (
  userData: Partial<N244FormData> = {},
): Promise<Uint8Array> => {
  try {
    // Fetch PDF from public URL
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const pdfUrl = `${protocol}://${host}/documents/forms/N244.pdf`;
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    const pdfBytes = await pdfResponse.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Helper: fill text field with configurable font size
    const fillTextField = (
      fieldName: string,
      value?: string,
      fontSize?: number,
    ) => {
      if (!value) return false;
      try {
        const field = form.getTextField(fieldName);
        field.setFontSize(fontSize ?? 10);
        field.setText(value.toUpperCase());
        return true;
      } catch (e) {
        console.warn(`Could not fill field "${fieldName}":`, e);
        return false;
      }
    };

    // Helper: check checkbox
    const checkBox = (fieldName: string, shouldCheck?: boolean) => {
      if (!shouldCheck) return false;
      try {
        const field = form.getCheckBox(fieldName);
        field.check();
        return true;
      } catch (e) {
        console.warn(`Could not check "${fieldName}":`, e);
        return false;
      }
    };

    const formData = { ...userData };

    // Current date parts
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString();

    // --- Header section ---
    fillTextField("Defendant's name, including reference", formData.userName);
    fillTextField("Claimant's name including reference", formData.applicant);
    fillTextField('Date of the the application', `${day}/${month}/${year}`);

    // --- Section 1: Applicant name ---
    fillTextField(
      '1. What is your name or, if you are a legal representative, the name of your firm?',
      formData.userName,
    );

    // --- Section 2: Defendant ---
    checkBox('2. Are you a - Defendant', true);

    // --- Section 3: Order sought (use smaller font to fit longer text) ---
    const orderText =
      formData.orderRequestText ||
      'I respectfully ask the court to set aside the county court judgment entered against me in relation to this parking penalty charge, as I did not receive the original notice and was unaware of the proceedings.';
    // Q3 is a small box (~5 lines). Scale font down only if AI output exceeds prompt limits
    const q3FontSize = orderText.length > 250 ? 8 : 10;
    fillTextField(
      '3. What order are you asking the court to make and why?',
      orderText,
      q3FontSize,
    );

    // --- Section 4: No draft order ---
    checkBox(
      '4. Have you attached a draft of the order you are applying for? No',
      true,
    );

    // --- Section 5: Without a hearing ---
    checkBox(
      '5. How do you want to have this application dealt with? - without a hearing',
      true,
    );

    // --- Section 8: Judge level ---
    fillTextField(
      '8. What level of Judge does your hearing need?',
      'District Judge',
    );

    // --- Section 9: Who should be served ---
    fillTextField(
      '9. Who should be served with this application?',
      formData.applicant,
    );

    // --- Section 10: Evidence ---
    checkBox(
      '10. What information will you be relying on, in support of your application? the evidence set out in the box below',
      true,
    );
    // Q10 is a large box — plenty of room. Only scale down for very long text
    const evidenceText = formData.reasonText || '';
    const q10FontSize = evidenceText.length > 600 ? 8 : 10;
    fillTextField(
      'evidence set out in the box below',
      evidenceText,
      q10FontSize,
    );

    // --- Section 11: Vulnerability ---
    checkBox(
      '11  Do you believe you, or a witness who will give evidence on your behalf, are vulnerable No',
      true,
    );

    // --- Statement of truth ---
    checkBox(
      'I believe that the facts stated in section 10 (and any continuation sheets) are true',
      true,
    );

    // --- Signature ---
    let signatureAdded = false;
    if (formData.signatureUrl) {
      // Signature is on page 4 (index 3)
      const signaturePage = pdfDoc.getPages()[3];
      if (signaturePage) {
        signatureAdded = await addSvgSignatureToField(
          signaturePage,
          form,
          'Signature box',
          formData.signatureUrl,
        );
      }
    }

    // Only fall back to text name if no SVG signature was added
    if (!signatureAdded && !formData.signatureUrl) {
      fillTextField('Signature box', formData.userName);
    }

    // --- Signed by ---
    checkBox('Signed by - Applicant', true);

    // --- Date of signature ---
    fillTextField('Date of signature - day', day);
    fillTextField('Date of signature - month', month);
    fillTextField('Date of signature - year', year);

    // --- Full name ---
    fillTextField(
      'Full name of person signing the Statement of Truth',
      formData.userName,
    );

    // --- Address block ---
    fillTextField('Building and street', formData.addressLine1);
    fillTextField('second line of address', formData.addressLine2);
    fillTextField('town or city', formData.city);
    fillTextField('county', formData.county);
    fillTextField(
      "postcode for the applicant's address",
      formData.userPostcode,
    );
    fillTextField('phone number', formData.userPhone);
    fillTextField('email address', formData.userEmail);

    const filledPdfBytes = await pdfDoc.save();
    return filledPdfBytes;
  } catch (error) {
    console.error('Error in fillN244Form:', error);
    throw error;
  }
};

export default fillN244Form;
