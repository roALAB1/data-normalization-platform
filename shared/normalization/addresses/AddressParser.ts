/**
 * Enhanced Address Parser
 * 
 * Handles:
 * 1. Secondary address component stripping (Apt, Suite, Unit, #, Bldg, etc.)
 * 2. Run-on address parsing (city/state extraction without commas)
 * 3. Title case normalization
 * 4. Street suffix abbreviations
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
  'trail', 'trl', 'terrace', 'ter', 'plaza', 'plz'
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
  // Matches: "Apt 402", "Suite 108", "Unit 2", "Bldg A", "Apt. 2111"
  const explicitPattern = /\b(apt|apartment|ste|suite|unit|bldg|building|floor|fl|flr|rm|room|sp|space|lot|trailer|trlr|tr|u|no|number)\.?\s*[a-z0-9\-]+\b/gi;
  cleaned = cleaned.replace(explicitPattern, '');
  
  // Pattern 2: Hash/pound sign with number
  // Matches: "#1124", "# 42", "#G"
  const hashPattern = /#\s*[a-z0-9\-]+\b/gi;
  cleaned = cleaned.replace(hashPattern, '');
  
  // Pattern 3: Trailing secondary (at end of address)
  // Matches: "123 Main St Apt 5", "456 Oak Ave Unit C"
  const trailingPattern = /\s+(apt|apartment|ste|suite|unit|bldg|building|floor|fl|rm|room|sp|space|lot|#)\.?\s*[a-z0-9\-]+$/gi;
  cleaned = cleaned.replace(trailingPattern, '');
  
  // Pattern 4: Embedded secondary (in middle of address)
  // Matches: "123 Main St Apt 5 City State"
  const embeddedPattern = /\s+(apt|apartment|ste|suite|unit|bldg|building|floor|fl|rm|room|sp|space|lot|#)\.?\s*[a-z0-9\-]+\s+/gi;
  cleaned = cleaned.replace(embeddedPattern, ' ');
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\.\s*\./g, '.'); // Remove double periods
  
  return cleaned;
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
  
  // Step 1: Extract ZIP code (5 digits at end)
  const zipMatch = remaining.match(/\b(\d{5})$/);
  if (zipMatch) {
    zip = zipMatch[1];
    remaining = remaining.substring(0, zipMatch.index).trim();
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
  const words = remaining.split(/\s+/);
  let streetEndIndex = -1;
  
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i].toLowerCase().replace(/[.,]/g, '');
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
    // Assume last 1-3 words before state are city
    const potentialCityWords = Math.min(3, words.length);
    city = words.slice(-potentialCityWords).join(' ');
    street = words.slice(0, -potentialCityWords).join(' ');
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
 * 
 * @param str - String to title case
 * @returns Title cased string
 */
export function titleCase(str: string): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
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
 * 1. Strip secondary address components
 * 2. Parse run-on address (if needed)
 * 3. Apply title case
 * 4. Return cleaned street address
 * 
 * @param address - Raw address string
 * @returns Normalized street address (without city/state/ZIP)
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  // Step 1: Parse run-on address to extract street component
  const parsed = parseRunOnAddress(address);
  
  // Step 2: Strip secondary address components from street
  const cleanStreet = stripSecondaryAddress(parsed.street || address);
  
  // Step 3: Apply title case
  const normalized = titleCase(cleanStreet);
  
  return normalized;
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
