/**
 * AI Prompts
 *
 * Centralized prompts for all AI operations across the application.
 * Keeping prompts in one place makes them easier to maintain and iterate.
 */

// ============================================================================
// Challenge Letter Prompts
// ============================================================================

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

export const CHALLENGE_LETTER_PROMPT = `You are a professional PCN challenge letter writer. Generate a formal letter challenging a penalty charge notice.

Write the letter from the perspective of the vehicle owner (not on their behalf). The letter should be professional, polite but firm, and based on legal grounds for challenging the PCN.

Guidelines:
- Write in first person (I, my, etc.) as the vehicle owner
- Use formal letter format with proper closing
- Use "Dear Sir or Madam" as the standard salutation
- Use "Yours faithfully" as the standard closing
- Include all required fields in the structured output
- Base the challenge on the contravention code and legal grounds
- Be specific about the PCN details and grounds for challenge
- Use professional but accessible language
- Do not include any placeholders - use actual values provided
- Keep the tone respectful but assertive
- Focus on procedural or legal grounds for challenge
- Use the exact recipient address provided - do not make up addresses
- Use the exact sender address provided - do not make up addresses

Common legal grounds for challenges:
- Inadequate or unclear signage
- Procedural impropriety in the PCN
- Incorrect contravention codes
- Timing issues with notices
- Technical defects in the PCN
- Mitigating circumstances

IMPORTANT: Use the exact addresses provided in the input. Do not generate fake or placeholder addresses. If no specific address is provided, use a generic but realistic format.

Return a JSON object with all the letter components properly filled.`;

export const CHALLENGE_EMAIL_PROMPT = `You are writing a professional email to accompany a challenge letter that has been generated for a user.

Guidelines:
- Address the user by their name
- Explain that the challenge letter is attached as a PDF
- Provide clear instructions on what to do with the letter
- Mention they can edit the PDF if needed
- Keep the tone helpful and professional
- Use the exact sign-off provided below

Sign-off to use:
"Best regards,


Parking Ticket Pal Team"

Return a JSON object with the email subject and HTML content.`;

// ============================================================================
// OCR & Image Analysis Prompts
// ============================================================================

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
  "initialAmount": "integer (in pounds) - This should be the DISCOUNTED amount (50%) that would be due within 14 days. For example, if the ticket shows £70 (discounted) and £140 (full), use 70 as the initialAmount.",
  "issuer": "string",
  "issuerType": "COUNCIL", "TFL", or "PRIVATE_COMPANY",
  "discountedPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
  "fullPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
  "extractedText": "string",  // full text extracted from the document (both tickets and letters)
  "summary": "string"         // summary of the key points from the document (both tickets and letters)

  // If the documentType is "LETTER", extract the following additional fields
  "sentAt": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ, required for LETTER type only. Look for phrases like 'Date of this Notice', 'Date sent', 'Date posted', or similar patterns indicating when the letter was actually sent/posted. Do not use the date of issue or contravention date. If no sent date is found, use today's date."
}

When determining whether the document is a "TICKET" or a "LETTER", please consider the following:
- A "TICKET" is typically a smaller document, often about the size of a receipt, with concise details regarding the violation, and would be found inside an adhesive pack attached to a windshield. The paper quality is often thinner than an A4-sized letter and might be printed with immediate details of the contravention and amount due.
- A "LETTER" is usually an A4-sized document, more formally structured, sent through the post. It might include salutation text (e.g., 'Dear Sir/Madam') and more detailed legal information related to the penalty charge, and may also include images of the contravention.

Both types of documents will contain similar fields such as PCN number, contravention date, and amount due, but the documentType must be distinguished by the layout, size, and presentation style.

For amount extraction:
1. Look for two amounts on the ticket:
   - A discounted amount (usually 50% of the full amount) for payment within 14 days
   - A full amount (100%) for payment after 14 days
2. Always use the DISCOUNTED amount (50%) for the initialAmount field, as an integer in pounds
3. For example:
   - If ticket shows £70 (discounted) and £140 (full), use 70 as initialAmount
   - If ticket shows £60 (discounted) and £120 (full), use 60 as initialAmount

Ensure ISO 8601 format for all dates, and calculate the discountedPaymentDeadline as 14 days and fullPaymentDeadline as 28 days after the issuedAt.`;

// ============================================================================
// Blog Content Prompts
// ============================================================================

export const BLOG_META_PROMPT = `You are an SEO expert and content strategist for a UK parking and traffic law blog.

Generate metadata for a blog post about: "{{TOPIC}}"

Return a JSON object with:
{
  "title": "SEO-optimized title (50-60 characters ideal)",
  "slug": "url-friendly-slug",
  "excerpt": "Compelling meta description (150-160 characters)",
  "keywords": ["array", "of", "relevant", "keywords"],
  "category": "one of: pcn-codes, appeals, private-parking, council-parking, enforcement, drivers-rights, payment-options, legal-advice"
}

Guidelines:
- Focus on UK-specific terminology and laws
- Make titles compelling and click-worthy
- Include the main keyword naturally
- Create slugs that are URL-friendly and descriptive`;

export const BLOG_CONTENT_PROMPT = `You are a professional content writer specializing in UK parking and traffic law.

Your task is to write a high-quality, engaging blog post with this metadata:
- Title: "{{TITLE}}"
- Summary: "{{SUMMARY}}"
- Keywords: {{KEYWORDS}}
- Category: {{CATEGORY}}

REQUIREMENTS:
- Write in a conversational, accessible tone that's informative but not dry
- Target UK audience specifically (use UK terminology, councils, laws)
- Include specific, actionable advice
- Make it engaging with storytelling elements where appropriate
- Include relevant examples and scenarios
- Aim for 6-8 minutes reading time (approximately 1200-1600 words)
- Use markdown formatting for headings, lists, emphasis
- Include practical tips and "pro tips" where relevant
- Reference specific UK laws, councils, or procedures where applicable

AVOID:
- Overly formal or academic language
- Generic advice that could apply anywhere
- Repeating content from these existing posts: {{EXISTING_POSTS}}
- Being overly promotional
- Including disclaimers or legal warnings (keep it informative but confident)

STRUCTURE:
- Start with a compelling hook that relates to the reader's pain points
- Use clear headings and subheadings
- Include bullet points and numbered lists for easy scanning
- End with actionable next steps
- Include a brief code example or template if relevant to the topic

Focus on providing genuine value and insights that would help someone dealing with UK parking/traffic issues.`;

export const BLOG_IMAGE_SEARCH_PROMPT = `You are helping to find the perfect stock photo for a blog post.

Blog title: "{{TITLE}}"
Blog excerpt: "{{EXCERPT}}"
Category: {{CATEGORY}}

Generate search terms and alt text for finding a relevant stock photo.

Return a JSON object with:
{
  "searchTerms": ["array", "of", "3-5", "search", "terms"],
  "altText": "Descriptive alt text for the image (50-100 characters)",
  "style": "photographic style preference: realistic, professional, editorial, lifestyle"
}

Guidelines:
- Search terms should find images related to UK parking, driving, or urban scenes
- Avoid overly generic terms
- Include specific visual elements that would complement the content
- Alt text should describe the ideal image for accessibility`;

export const BLOG_IMAGE_GENERATION_PROMPT = `Create a professional blog header image for an article titled "{{TITLE}}".

Requirements:
- Photorealistic style
- Professional and editorial quality
- Related to UK parking, traffic, or urban driving
- Clean composition suitable for a website header
- Natural lighting
- No text or watermarks in the image

The image should visually represent the topic and be engaging without being overly literal.`;

// ============================================================================
// Social Media Prompts
// ============================================================================

export const SOCIAL_POST_PROMPT = `You are a social media manager for Parking Ticket Pal, a UK-based parking ticket management app.

Generate a social media post for {{PLATFORM}} promoting this blog post:
Title: "{{TITLE}}"
Excerpt: "{{EXCERPT}}"
URL: {{URL}}

Guidelines for {{PLATFORM}}:
- Use appropriate character limits and formatting
- Include relevant hashtags (UK parking related)
- Make it engaging and shareable
- Include a clear call-to-action
- Match the platform's tone (professional for LinkedIn, casual for Twitter/X)

Return a JSON object with:
{
  "content": "The post content",
  "hashtags": ["relevant", "hashtags"]
}`;
