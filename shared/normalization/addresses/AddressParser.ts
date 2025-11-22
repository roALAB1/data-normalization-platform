/**
 * Enhanced Address Parser
 * 
 * Handles:
 * 1. PO Box detection and normalization
 * 2. Secondary address component stripping (Apt, Suite, Unit, #, Bldg, etc.)
 * 3. Run-on address parsing (city/state extraction without commas)
 * 4. Title case normalization
 * 5. Street suffix abbreviations
 * 6. Confidence scoring
 */

// US State Abbreviations
export const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming'
};

// Create reverse lookup (full name → abbreviation)
export const STATE_NAME_TO_ABBR: Record<string, string> = Object.entries(US_STATES).reduce(
  (acc, [abbr, name]) => {
    acc[name.toLowerCase()] = abbr;
    return acc;
  },
  {} as Record<string, string>
);

// Street suffixes for detection
export const STREET_SUFFIXES = [
  'street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd',
  'drive', 'dr', 'lane', 'ln', 'court', 'ct', 'circle', 'cir',
  'place', 'pl', 'way', 'highway', 'hwy', 'parkway', 'pkwy',
  'trail', 'trl', 'terrace', 'ter', 'plaza', 'plz', 'box' // PO Box support
];

// Secondary address indicators
export const SECONDARY_INDICATORS = [
  'apt', 'apartment', 'ste', 'suite', 'unit', 'u', 'bldg', 'building',
  'floor', 'fl', 'flr', 'rm', 'room', 'sp', 'space', 'lot',
  'trailer', 'trlr', 'tr', 'no', 'number', '#'
];

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface NormalizedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  isPOBox?: boolean;
  boxNumber?: string;
}

export interface AddressParseResult extends NormalizedAddress {
  confidence?: {
    street: number;
    city: number;
    state: number;
    zip: number;
    overall: number;
  };
  flags?: string[];
  confidence_level?: 'high' | 'medium' | 'low';
}

/**
 * Strip secondary address components (Apt, Suite, Unit, etc.)
 * 
 * @param address - Full address string
 * @returns Address with secondary components removed
 */
export function stripSecondaryAddress(address: string): string {
  if (!address) return '';
  
  let cleaned = address;
  
  // Pattern 1: Explicit secondary address (word + number/letter)
  // Matches: "Apt 402", "Suite 108", "Unit 2", "Bldg A", "Apt. 2111", "No 5"
  // Use word boundaries on BOTH sides to ensure complete word match (not "North" or "Trailer")
  const explicitPattern = /\b(apt|apartment|ste|suite|unit|bldg|building|floor|fl|flr|rm|room|sp|space|lot|trlr|u|number)\.?\s+[a-z0-9\-]+\b/gi;
  cleaned = cleaned.replace(explicitPattern, '');
  
  // Special case: "No" and "Trailer" and "Tr" - only match if followed by a digit (not a letter)
  // This prevents matching "North-South" or "Trailer Park"
  const numberOnlyPattern = /\b(no|trailer|tr)\.?\s+\d+[a-z]?\b/gi;
  cleaned = cleaned.replace(numberOnlyPattern, '');
  
  // Pattern 2: Hash/pound sign with number
  // Matches: "#1124", "# 42", "#G"
  const hashPattern = /#\s*[a-z0-9\-]+\b/gi;
  cleaned = cleaned.replace(hashPattern, '');
  
  // Pattern 3: Trailing secondary (at end of address)
  // Matches: "123 Main St Apt 5", "456 Oak Ave Unit C"
  // Use word boundary to prevent matching "Springfield" as "sp"
  const trailingPattern = /\s+(apt|apartment|ste|suite|unit|bldg|building|floor|fl|rm|room|sp|space|lot|#)\b\.?\s*[a-z0-9\-]+$/gi;
  cleaned = cleaned.replace(trailingPattern, '');
  
  // Pattern 4: Embedded secondary (in middle of address)
  // Matches: "123 Main St Apt 5 City State"
  // Use word boundary to prevent matching "Springfield" as "sp"
  const embeddedPattern = /\s+(apt|apartment|ste|suite|unit|bldg|building|floor|fl|rm|room|sp|space|lot|#)\b\.?\s*[a-z0-9\-]+\s+/gi;
  cleaned = cleaned.replace(embeddedPattern, ' ');
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\.\s*\./g, '.'); // Remove double periods
  
  return cleaned;
}

/**
 * Normalize PO Box format to standard "PO Box XXX"
 * 
 * @param address - Raw address string
 * @returns Object with normalized address and PO Box info
 */
function normalizePOBox(address: string): { address: string; isPOBox: boolean; boxNumber: string } {
  if (!address) {
    return { address: '', isPOBox: false, boxNumber: '' };
  }
  
  // Pattern matches various PO Box formats:
  // - P.O. Box 123
  // - PO Box 123
  // - POBox 123
  // - P O Box 123
  // - P.O.Box 123
  // - P.O. BOX 123
  // - etc.
  const poBoxPattern = /\b(p\.?\s*o\.?\s*box|pobox|p\s+o\s+box)\s+([a-z0-9\-]+)\b/gi;
  const match = poBoxPattern.exec(address);
  
  if (match) {
    const boxNumber = match[2].trim();
    // Replace with standard format
    const normalized = address.replace(
      /\b(p\.?\s*o\.?\s*box|pobox|p\s+o\s+box)\s+/gi,
      'PO Box '
    );
    return { address: normalized, isPOBox: true, boxNumber: boxNumber };
  }
  
  return { address: address, isPOBox: false, boxNumber: '' };
}

/**
 * Parse run-on address (extract city, state, ZIP from address without commas)
 * 
 * @param address - Full address string (may contain city/state/ZIP without commas)
 * @returns Parsed address components
 */
export function parseRunOnAddress(address: string): ParsedAddress {
  if (!address) {
    return { street: '', city: '', state: '', zip: '' };
  }
  
  let remaining = address.trim();
  let zip = '';
  let state = '';
  let city = '';
  let street = '';
  
  // Step 1: Extract ZIP code (5 digits or ZIP+4 format: 12345-6789)
  // Try ZIP+4 first, then fall back to 5-digit ZIP
  const zip4Match = remaining.match(/\b(\d{5}-\d{4})$/);
  if (zip4Match) {
    zip = zip4Match[1];
    remaining = remaining.substring(0, zip4Match.index).trim();
  } else {
    const zipMatch = remaining.match(/\b(\d{5})$/);
    if (zipMatch) {
      zip = zipMatch[1];
      remaining = remaining.substring(0, zipMatch.index).trim();
    }
  }
  
  // Step 2: Extract state (2-letter code at end or before ZIP)
  const stateMatch = remaining.match(/\b([A-Z]{2})\s*$/i);
  if (stateMatch) {
    const stateCandidate = stateMatch[1].toUpperCase();
    if (US_STATES[stateCandidate]) {
      state = stateCandidate;
      remaining = remaining.substring(0, stateMatch.index).trim();
    }
  }
  
  // Step 3: Extract city (words between street and state)
  // Find last street suffix to identify where street ends
  // Preserve hyphens in street names (they are NOT word boundaries)
  const words = remaining.split(/\s+/);
  let streetEndIndex = -1;
  
  // Special handling for PO Box: "PO Box XXX" should be treated as complete street
  if (words.length >= 3 && words[0].toUpperCase() === 'PO' && words[1].toLowerCase() === 'box') {
    // PO Box format: take "PO Box" + box number as street
    street = words.slice(0, 3).join(' '); // "PO Box 456"
    // Everything after box number = city/state/zip
    const remaining2 = words.slice(3).join(' ');
    if (remaining2) {
      // Parse city from remaining
      const cityWords = remaining2.split(/\s+/);
      if (cityWords.length > 0) {
        city = cityWords[0]; // First word after box number is city
      }
    }
    return { street: street.trim(), city: city.trim(), state: state.trim(), zip: zip.trim() };
  }
  
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i].toLowerCase().replace(/[.,]/g, '');
    // Check if entire word is a street suffix (don't split on hyphens)
    if (STREET_SUFFIXES.includes(word)) {
      streetEndIndex = i;
      break;
    }
  }
  
  if (streetEndIndex >= 0 && streetEndIndex < words.length - 1) {
    // Everything after street suffix = city
    const cityWords = words.slice(streetEndIndex + 1);
    city = cityWords.join(' ');
    street = words.slice(0, streetEndIndex + 1).join(' ');
  } else if (state && remaining) {
    // No street suffix found, but we have a state
    // Try to identify city by looking for capitalized words before state
    // Heuristic: City is typically 1-3 words before state
    // Street address typically starts with a number
    const hasNumberPrefix = /^\d+/.test(words[0]);
    
    if (hasNumberPrefix && words.length >= 2) {
      // Likely format: "123 Main Durham" or "456 Maple Dr Springfield"
      // Check if second-to-last word looks like a street suffix abbreviation
      const secondToLast = words.length >= 2 ? words[words.length - 2].toLowerCase().replace(/[.,]/g, '') : '';
      const isCommonAbbr = ['dr', 'st', 'ave', 'rd', 'ln', 'ct', 'blvd', 'way', 'box'].includes(secondToLast);
      
      if (isCommonAbbr && words.length >= 3) {
        // Format: "456 Maple Dr Springfield" - last word is city, everything before is street
        city = words[words.length - 1];
        street = words.slice(0, -1).join(' ');
      } else {
        // Format: "123 Main Durham" - last word is city, rest is street
        city = words[words.length - 1];
        street = words.slice(0, -1).join(' ');
      }
    } else {
      // Fallback: assume last 1-3 words are city
      const potentialCityWords = Math.min(3, words.length);
      city = words.slice(-potentialCityWords).join(' ');
      street = words.slice(0, -potentialCityWords).join(' ');
    }
  } else {
    // No parsing possible, return as-is
    street = remaining;
  }
  
  return {
    street: street.trim(),
    city: city.trim(),
    state: state.trim(),
    zip: zip.trim()
  };
}

/**
 * Title case a string (capitalize first letter of each word)
 * Handles hyphens and apostrophes correctly
 * Removes periods from abbreviations (W. → W, St. → St)
 * 
 * @param str - String to title case
 * @returns Title cased string
 */
export function titleCase(str: string): string {
  if (!str) return '';
  
  const lowerStr = str.toLowerCase();
  
  // Special case: preserve PO Box format - check for space after
  if (lowerStr.startsWith('po box ')) {
    // Already normalized, just ensure uppercase PO Box
    return 'PO Box ' + titleCase(str.slice(7));
  }
  
  // Also handle "PO Box" without trailing space (end of string)
  if (lowerStr === 'po box') {
    return 'PO Box';
  }
  
  return lowerStr
    .split(/\s+/)
    .map(word => {
      // Remove periods from abbreviations (W. → W, St. → St)
      word = word.replace(/\./g, '');
      
      // Handle hyphenated words (e.g., "north-south" → "North-South")
      if (word.includes('-')) {
        return word.split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join('-');
      }
      
      // Handle apostrophes (e.g., "o'brien" → "O'Brien")
      if (word.includes("'")) {
        return word.split("'").map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join("'");
      }
      
      // Regular word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Normalize address (full pipeline)
 * 
 * 1. Detect and normalize PO Box
 * 2. Strip secondary address components
 * 3. Parse run-on address (if needed)
 * 4. Apply title case
 * 5. Return cleaned street address with extracted city/state/ZIP
 * 
 * @param address - Raw address string
 * @returns Normalized address with separate street, city, state, ZIP
 */
export function normalizeAddress(address: string): NormalizedAddress {
  if (!address) {
    return { street: '', city: '', state: '', zip: '', isPOBox: false, boxNumber: '' };
  }
  
  // Step 0: Detect and normalize PO Box
  const poBoxNormalized = normalizePOBox(address);
  const isPOBox = poBoxNormalized.isPOBox;
  const boxNumber = poBoxNormalized.boxNumber;
  
  // Step 1: Strip secondary address components FIRST (before parsing)
  // This prevents "Apt 402" from being detected as part of city
  const cleanedAddress = stripSecondaryAddress(poBoxNormalized.address);
  
  // Step 2: Parse run-on address to extract all components
  const parsed = parseRunOnAddress(cleanedAddress);
  
  // Step 3: Apply title case to street and city
  const normalizedStreet = titleCase(parsed.street);
  const normalizedCity = titleCase(parsed.city);
  
  return {
    street: normalizedStreet,
    city: normalizedCity,
    state: parsed.state.toUpperCase(), // Ensure state is uppercase abbreviation
    zip: parsed.zip,
    isPOBox: isPOBox,
    boxNumber: boxNumber
  };
}

/**
 * Normalize address (legacy string output for backward compatibility)
 * 
 * @param address - Raw address string
 * @returns Normalized street address only (without city/state/ZIP)
 */
export function normalizeAddressString(address: string): string {
  const normalized = normalizeAddress(address);
  return normalized.street;
}

/**
 * Format address for display
 * 
 * @param address - Normalized address object
 * @returns Formatted address string
 */
export function formatAddress(address: NormalizedAddress): string {
  const parts: string[] = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zip) parts.push(address.zip);
  
  return parts.join(', ');
}

/**
 * Parse location string into city and state
 * Handles formats:
 * - "Durham, NC"
 * - "Durham, North Carolina"
 * - "Durham NC"
 * - "Durham North Carolina"
 * 
 * @param location - Location string
 * @returns { city, state }
 */
export function parseLocation(location: string): { city: string; state: string } {
  if (!location) return { city: '', state: '' };
  
  // Remove country if present (e.g., "Durham, NC, United States")
  let cleaned = location.replace(/,\s*(United States|USA|US)$/i, '').trim();
  
  // Try comma-separated format first
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const city = parts[0];
      const stateInput = parts[1];
      
      // Check if state is abbreviation or full name
      const stateUpper = stateInput.toUpperCase();
      if (US_STATES[stateUpper]) {
        return { city: titleCase(city), state: stateUpper };
      }
      
      // Check if full state name
      const stateLower = stateInput.toLowerCase();
      if (STATE_NAME_TO_ABBR[stateLower]) {
        return { city: titleCase(city), state: STATE_NAME_TO_ABBR[stateLower] };
      }
      
      return { city: titleCase(city), state: stateInput };
    }
  }
  
  // Try space-separated format (e.g., "Durham NC")
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1].toUpperCase();
    
    // Check if last word is state abbreviation
    if (US_STATES[lastWord]) {
      const city = words.slice(0, -1).join(' ');
      return { city: titleCase(city), state: lastWord };
    }
    
    // Check if last 1-2 words are full state name
    for (let i = 1; i <= 2 && i < words.length; i++) {
      const potentialState = words.slice(-i).join(' ').toLowerCase();
      if (STATE_NAME_TO_ABBR[potentialState]) {
        const city = words.slice(0, -i).join(' ');
        return { city: titleCase(city), state: STATE_NAME_TO_ABBR[potentialState] };
      }
    }
  }
  
  // No state found, return as-is
  return { city: titleCase(cleaned), state: '' };
}
