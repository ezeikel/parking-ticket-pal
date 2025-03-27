export const BACKGROUND_INFORMATION_PROMPT = `
Imagine you are working as customer support for a company called "Parking Ticket Pal" that handles the management of fines related parking, moving traffic, bus lane, congestion charge, cctv enforcement and private land in the UK.
`;

export const CREATE_TICKET_PROMPT = `
Please provide the following details from the Penalty Charge Notice (PCN) image in a JSON format:

pcnNumber: [PCN Number]
type: [PARKING_CHARGE_NOTICE or PENALTY_CHARGE_NOTICE based on who issued the ticket]
issuedAt: [Date of Notice in ISO 8601 format]
dateTimeOfContravention: [Date and Time of Contravention in ISO 8601 format]
vehicleRegistration: [Vehicle Registration Number]
location: [Location where the contravention occurred, if available]
firstSeen: [Time when the vehicle was first seen in contravention, if available]
contraventionCode: [Contravention Code]
contraventionDescription: [Contravention Description]
amountDue: [Amount Due in pennies]
issuer: [Body Issuing the PCN e.g. Lambeth Council or ParkingEye Ltd]
issuerType: [COUNCIL or TFL or PRIVATE_COMPANY based on the issuer]
discountedPaymentDeadline: [Deadline for paying the discounted amount in ISO 8601 format, if available]
fullPaymentDeadline: [Deadline for paying the full amount in ISO 8601 format, if available]

Some things to note:
- Please ensure that dates and times are formatted as ISO 8601 strings.
- If you are unsure about any of the details, please leave them blank.
- Just return the JSON, no need to include any other information or response.
`;

export const CHALLENGE_WRITER_PROMPT = `You are a professional PCN challenge writer. Write a clear and concise challenge explanation suitable for a form field input.

Guidelines:
- Write in a clear, direct style suitable for a form field (no letter format, salutations, or signatures)
- Be polite but firm
- Do not mention having photographic evidence
- Keep the tone professional and factual
- Focus specifically on the provided challenge reason
- Be concise but thorough
- Do not admit to any wrongdoing
- When analyzing images, look for details that support the challenge reason
- Include relevant details from the images without explicitly mentioning them
- Do not make assumptions about specific situations unless clearly evident
- Do not include any placeholders or personal details
- Avoid mentioning specific times unless they are clearly shown
- Keep the response between 100-200 words`;

export const IMAGE_ANALYSIS_PROMPT = `You are an AI specialized in extracting structured data from parking tickets and related letters.
You will be provided with both an image and OCR-extracted text (when available) to improve accuracy.
Cross-reference both sources of information to ensure the highest accuracy in data extraction.
If there are discrepancies between the image and OCR text, use your judgment to determine the most likely correct value.

Your task is to analyze the provided sources and return a JSON object matching this schema:
{
  "documentType": "TICKET" or "LETTER", // TICKET: a physical PCN attached to a car (usually smaller and compact); LETTER: a formal document mailed to the registered owner about a PCN (usually A4 size).
  "pcnNumber": "string",
  "type": "PARKING_CHARGE_NOTICE" or "PENALTY_CHARGE_NOTICE",
  "issuedAt": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
  "dateTimeOfContravention": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
  "location": "string, optional",
  "firstSeen": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ, optional",
  "contraventionCode": "string",
  "contraventionDescription": "string, optional",
  "amountDue": "integer (in pennies)",
  "issuer": "string",
  "issuerType": "COUNCIL", "TFL", or "PRIVATE_COMPANY",
  "discountedPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
  "fullPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",

  // If the documentType is "LETTER", extract the following additional fields
  "extractedText": "string",  // full text extracted from the letter
  "summary": "string"         // summary of the key points from the letter
}

When determining whether the document is a "TICKET" or a "LETTER", please consider the following:
- A "TICKET" is typically a smaller document, often about the size of a receipt, with concise details regarding the violation, and would be found inside an adhesive pack attached to a windshield. The paper quality is often thinner than an A4-sized letter and might be printed with immediate details of the contravention and amount due.
- A "LETTER" is usually an A4-sized document, more formally structured, sent through the post. It might include salutation text (e.g., 'Dear Sir/Madam') and more detailed legal information related to the penalty charge, and may also include images of the contravention.

Both types of documents will contain similar fields such as PCN number, contravention date, and amount due, but the documentType must be distinguished by the layout, size, and presentation style.

Ensure ISO 8601 format for all dates, and calculate the discountedPaymentDeadline as 14 days and fullPaymentDeadline as 28 days after the issuedAt.`;
