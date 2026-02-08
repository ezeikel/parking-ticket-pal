/**
 * Parser for letter content to extract structured components for PDF rendering
 * Handles various letter templates with UK business letter format
 */

export type LetterSection = {
  heading?: string;
  content: string;
};

export type ParsedLetterContent = {
  senderBlock: string[];
  date: string;
  recipientBlock: string[];
  salutation: string;
  subject: string;
  sections: LetterSection[];
  closing: string;
  signatureName: string;
};

// Patterns for detecting different parts of the letter
const DATE_PATTERN = /^\d{1,2}(st|nd|rd|th)?\s+\w+\s+\d{4}$/i;
const SALUTATION_PATTERN = /^Dear\s+/i;
const SUBJECT_PATTERN = /^(RE:|Subject:|NOTICE OF APPEAL)/i;
const CLOSING_PATTERNS = [
  /^Yours\s+(faithfully|sincerely)/i,
  /^Signed:/i,
  /^Name:/i,
];
const SECTION_HEADING_PATTERNS = [
  /^STATUTORY\s+GROUND/i,
  /^DETAILED\s+REASON/i,
  /^CONCLUSION/i,
  /^GROUNDS\s+FOR/i,
  /^MITIGATING\s+CIRCUMSTANCE/i,
  /^STATEMENT$/i,
  /^EVIDENCE$/i,
  /^DECLARATION$/i,
  /^[A-Z][A-Z\s]{3,}$/, // All caps lines with at least 4 chars
];

// Check if a line is a section heading
const isSectionHeading = (line: string): boolean => {
  const trimmed = line.trim();
  return SECTION_HEADING_PATTERNS.some((pattern) => pattern.test(trimmed));
};

// Convert ALL CAPS text to Title Case
const toTitleCase = (text: string): string => {
  // Only convert if the text is mostly uppercase (allowing for small words)
  const words = text.trim().split(/\s+/);
  const uppercaseWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));

  // If less than half the words are uppercase, don't convert
  if (uppercaseWords.length < words.length / 2) {
    return text;
  }

  return words
    .map((word, index) => {
      // Keep small connector words lowercase unless first word
      const lowerWord = word.toLowerCase();
      const smallWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
      if (index > 0 && smallWords.includes(lowerWord)) {
        return lowerWord;
      }
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Check if a line looks like a date
const isDateLine = (line: string): boolean => {
  return DATE_PATTERN.test(line.trim());
};

// Check if a line is a salutation
const isSalutation = (line: string): boolean => {
  return SALUTATION_PATTERN.test(line.trim());
};

// Check if a line is a subject line
const isSubjectLine = (line: string): boolean => {
  return SUBJECT_PATTERN.test(line.trim());
};

// Check if a line is a closing
const isClosing = (line: string): boolean => {
  return CLOSING_PATTERNS.some((pattern) => pattern.test(line.trim()));
};

/**
 * Parse letter content string into structured format
 */
export const parseLetterContent = (content: string): ParsedLetterContent => {
  // Split into lines and filter empty ones for processing
  const lines = content.split('\n').map((line) => line.trim());

  const result: ParsedLetterContent = {
    senderBlock: [],
    date: '',
    recipientBlock: [],
    salutation: '',
    subject: '',
    sections: [],
    closing: '',
    signatureName: '',
  };

  let currentIndex = 0;

  // Phase 1: Extract sender block (first block of non-empty lines)
  while (currentIndex < lines.length && lines[currentIndex] !== '') {
    result.senderBlock.push(lines[currentIndex]);
    currentIndex++;
  }

  // Skip empty lines
  while (currentIndex < lines.length && lines[currentIndex] === '') {
    currentIndex++;
  }

  // Phase 2: Look for date
  if (currentIndex < lines.length && isDateLine(lines[currentIndex])) {
    result.date = lines[currentIndex];
    currentIndex++;
  }

  // Skip empty lines
  while (currentIndex < lines.length && lines[currentIndex] === '') {
    currentIndex++;
  }

  // Phase 3: Extract recipient block (next block of non-empty lines before salutation)
  while (
    currentIndex < lines.length &&
    lines[currentIndex] !== '' &&
    !isSalutation(lines[currentIndex])
  ) {
    result.recipientBlock.push(lines[currentIndex]);
    currentIndex++;
  }

  // Skip empty lines
  while (currentIndex < lines.length && lines[currentIndex] === '') {
    currentIndex++;
  }

  // Phase 4: Find salutation
  if (currentIndex < lines.length && isSalutation(lines[currentIndex])) {
    result.salutation = lines[currentIndex];
    currentIndex++;
  }

  // Skip empty lines
  while (currentIndex < lines.length && lines[currentIndex] === '') {
    currentIndex++;
  }

  // Phase 5: Find subject line (often starts with "RE:")
  // Look for subject pattern in next few lines
  let subjectFound = false;
  const tempLines: string[] = [];

  while (currentIndex < lines.length && !subjectFound) {
    const line = lines[currentIndex];

    if (line === '') {
      // Check if we've collected any lines that might be the subject block
      if (tempLines.length > 0) {
        // Check if any collected line is a subject
        const subjectLine = tempLines.find((l) => isSubjectLine(l));
        if (subjectLine) {
          // The whole block starting with RE: is the subject
          result.subject = tempLines.join('\n');
          subjectFound = true;
        } else {
          // These lines are part of body sections
          break;
        }
      }
      currentIndex++;
      continue;
    }

    if (isSubjectLine(line) || tempLines.some((l) => isSubjectLine(l))) {
      tempLines.push(line);
    } else if (tempLines.length === 0) {
      // Haven't found subject start yet, check if this line could be subject
      tempLines.push(line);
    } else {
      break;
    }

    currentIndex++;
  }

  // If we didn't find a proper subject, use the collected lines as subject anyway
  if (!subjectFound && tempLines.length > 0) {
    result.subject = tempLines.join('\n');
  }

  // Skip empty lines
  while (currentIndex < lines.length && lines[currentIndex] === '') {
    currentIndex++;
  }

  // Phase 6: Parse body sections until we hit closing
  let currentSection: LetterSection = { content: '' };
  let foundClosing = false;

  while (currentIndex < lines.length && !foundClosing) {
    const line = lines[currentIndex];

    if (isClosing(line)) {
      // Save current section if it has content
      if (currentSection.content.trim() || currentSection.heading) {
        result.sections.push({
          heading: currentSection.heading,
          content: currentSection.content.trim(),
        });
      }
      result.closing = line;
      foundClosing = true;
      currentIndex++;
      continue;
    }

    if (line === '') {
      // Empty line - might be paragraph break
      if (currentSection.content.trim()) {
        currentSection.content += '\n\n';
      }
      currentIndex++;
      continue;
    }

    if (isSectionHeading(line)) {
      // Save previous section if it has content
      if (currentSection.content.trim() || currentSection.heading) {
        result.sections.push({
          heading: currentSection.heading,
          content: currentSection.content.trim(),
        });
      }
      // Start new section with this heading (converted to Title Case)
      currentSection = { heading: toTitleCase(line), content: '' };
      currentIndex++;
      continue;
    }

    // Regular content line
    if (currentSection.content) {
      currentSection.content += '\n' + line;
    } else {
      currentSection.content = line;
    }
    currentIndex++;
  }

  // Don't forget to add the last section if not already added
  if (!foundClosing && (currentSection.content.trim() || currentSection.heading)) {
    result.sections.push({
      heading: currentSection.heading,
      content: currentSection.content.trim(),
    });
  }

  // Skip empty lines after closing
  while (currentIndex < lines.length && lines[currentIndex] === '') {
    currentIndex++;
  }

  // Phase 7: Get signature name (remaining non-empty lines)
  const signatureLines: string[] = [];
  while (currentIndex < lines.length) {
    if (lines[currentIndex] !== '') {
      signatureLines.push(lines[currentIndex]);
    }
    currentIndex++;
  }
  result.signatureName = signatureLines.join('\n');

  return result;
};

export default parseLetterContent;
