/**
 * Search term mappings for Pexels photo searches
 *
 * Maps blog categories and topics to relevant search terms
 * Terms are ordered by relevance - first term is most specific
 */

// Category-based search terms
export const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  // PCN and parking specific
  'pcn-codes': [
    'parking meter',
    'street parking',
    'parking sign',
    'traffic warden',
    'parking ticket',
  ],
  'parking-fines': [
    'parking ticket',
    'parking fine',
    'parking violation',
    'traffic enforcement',
    'car parking',
  ],
  appeals: [
    'writing letter',
    'legal document',
    'paperwork desk',
    'signing document',
    'formal letter',
  ],
  enforcement: [
    'parking enforcement',
    'traffic officer',
    'parking warden',
    'street parking',
    'urban parking',
  ],
  // General topics
  driving: [
    'car driving',
    'urban driving',
    'city traffic',
    'road travel',
    'motorway',
  ],
  'car-park': [
    'car park',
    'parking lot',
    'multi storey parking',
    'parking garage',
    'parking structure',
  ],
  'road-signs': [
    'road sign',
    'traffic sign',
    'street sign',
    'parking sign',
    'no parking sign',
  ],
  legal: [
    'legal document',
    'gavel law',
    'courthouse',
    'justice scales',
    'lawyer office',
  ],
  money: [
    'money finance',
    'coins pounds',
    'wallet payment',
    'bills money',
    'savings',
  ],
  stress: [
    'stressed person',
    'frustrated driver',
    'worried person',
    'anxious waiting',
    'concerned face',
  ],
  success: [
    'celebration success',
    'happy person',
    'thumbs up',
    'victory celebration',
    'relief joy',
  ],
  // UK-specific locations
  london: [
    'london street',
    'london parking',
    'uk city street',
    'british street',
    'london traffic',
  ],
  council: [
    'town hall',
    'council building',
    'government office',
    'public building uk',
    'civic centre',
  ],
};

// Topic-specific search terms (for blog post titles/keywords)
export const TOPIC_SEARCH_TERMS: Record<string, string[]> = {
  // Common blog topics
  'how to appeal': [
    'writing letter',
    'paperwork desk',
    'formal document',
    'pen paper',
  ],
  'parking ticket': [
    'parking ticket',
    'car windshield ticket',
    'parking fine',
    'parking violation',
  ],
  challenge: [
    'legal challenge',
    'writing appeal',
    'document review',
    'formal letter',
  ],
  evidence: [
    'collecting evidence',
    'camera photo',
    'documentation',
    'proof gathering',
  ],
  deadline: [
    'calendar deadline',
    'time pressure',
    'clock urgency',
    'schedule planning',
  ],
  payment: ['payment card', 'online payment', 'money transfer', 'paying bills'],
  council: [
    'council office',
    'government building',
    'public service',
    'civic centre',
  ],
  tribunal: [
    'tribunal hearing',
    'courtroom',
    'legal proceeding',
    'formal hearing',
  ],
  // Vehicle types
  car: ['parked car', 'car street', 'automobile urban', 'vehicle parking'],
  motorcycle: ['motorcycle parking', 'motorbike street', 'scooter urban'],
  // Time-based
  morning: ['morning traffic', 'sunrise city', 'early commute', 'dawn urban'],
  evening: ['evening traffic', 'sunset city', 'rush hour', 'night urban'],
  weekend: ['weekend street', 'quiet road', 'sunday parking', 'weekend city'],
};

// Fallback terms for generic parking content
export const FALLBACK_SEARCH_TERMS = [
  'city parking',
  'urban street',
  'parked cars',
  'street view city',
  'urban landscape',
];

/**
 * Get search terms for a blog category
 */
export function getSearchTermsForCategory(category: string): string[] {
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-');
  return CATEGORY_SEARCH_TERMS[normalizedCategory] || FALLBACK_SEARCH_TERMS;
}

/**
 * Get search terms based on blog post keywords/title
 * Analyzes the text to find relevant search terms
 */
export function getSearchTermsForTopic(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const matchedTerms: string[] = [];

  // Check each topic for matches in the text
  for (const [topic, terms] of Object.entries(TOPIC_SEARCH_TERMS)) {
    if (normalizedText.includes(topic)) {
      matchedTerms.push(...terms);
    }
  }

  // If no matches, use fallback
  if (matchedTerms.length === 0) {
    return FALLBACK_SEARCH_TERMS;
  }

  // Remove duplicates and return
  return [...new Set(matchedTerms)];
}

/**
 * Combine category and topic search terms, deduplicating
 */
export function getCombinedSearchTerms(
  category: string,
  title: string,
): string[] {
  const categoryTerms = getSearchTermsForCategory(category);
  const topicTerms = getSearchTermsForTopic(title);

  // Combine and deduplicate, prioritizing topic-specific terms
  const combined = [...topicTerms, ...categoryTerms];
  return [...new Set(combined)];
}

/**
 * Generate alt text for a parking-related image
 */
export function generateAltText(
  searchTerm: string,
  context: { title?: string; category?: string } = {},
): string {
  // If we have title context, use it
  if (context.title) {
    return `Image related to ${context.title}`;
  }

  // Otherwise, base it on the search term
  const cleanedTerm = searchTerm
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `${cleanedTerm} - Parking Ticket Pal Blog`;
}
