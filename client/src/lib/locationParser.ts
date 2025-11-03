/**
 * Location Parser
 * 
 * Parses location strings into city, state, and country components.
 * Handles formats like:
 * - "Durham, North Carolina, United States"
 * - "San Francisco Bay Area"
 * - "Washington DC-Baltimore Area"
 * 
 * v3.13.4: Created for location splitting feature
 */

// US State name to abbreviation mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC',
  'washington dc': 'DC',
};

// Reverse mapping for abbreviation to full name
const ABBREVIATION_TO_STATE: Record<string, string> = Object.entries(STATE_ABBREVIATIONS)
  .reduce((acc, [name, abbr]) => {
    acc[abbr] = name;
    return acc;
  }, {} as Record<string, string>);

export interface ParsedLocation {
  city: string | null;
  state: string | null; // 2-letter abbreviation
  country: string | null;
  raw: string;
}

/**
 * Parse a location string into components
 */
export function parseLocation(location: string): ParsedLocation {
  if (!location || typeof location !== 'string') {
    return { city: null, state: null, country: null, raw: location };
  }

  const raw = location.trim();
  
  // Split by comma
  const parts = raw.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return { city: null, state: null, country: null, raw };
  }
  
  // Standard format: "City, State, Country" or "City, State"
  if (parts.length >= 2) {
    const city = parts[0];
    const statePart = parts[1];
    const country = parts.length >= 3 ? parts[2] : null;
    
    // Try to find state abbreviation
    const stateAbbr = findStateAbbreviation(statePart);
    
    if (stateAbbr) {
      return { city, state: stateAbbr, country, raw };
    }
  }
  
  // Single part - might be "City State" format
  if (parts.length === 1) {
    const result = parseUnstructuredLocation(parts[0]);
    return { ...result, raw };
  }
  
  // Fallback - return first part as city
  return { city: parts[0], state: null, country: null, raw };
}

/**
 * Find state abbreviation from a state name or abbreviation
 */
function findStateAbbreviation(statePart: string): string | null {
  if (!statePart) return null;
  
  const normalized = statePart.toLowerCase().trim();
  
  // Check if it's already an abbreviation
  const upper = statePart.toUpperCase().trim();
  if (upper.length === 2 && ABBREVIATION_TO_STATE[upper]) {
    return upper;
  }
  
  // Check if it's a full state name
  if (STATE_ABBREVIATIONS[normalized]) {
    return STATE_ABBREVIATIONS[normalized];
  }
  
  return null;
}

/**
 * Parse unstructured location like "San Francisco Bay Area" or "Washington DC-Baltimore Area"
 */
function parseUnstructuredLocation(location: string): Omit<ParsedLocation, 'raw'> {
  const lower = location.toLowerCase();
  
  // Remove common area suffixes to extract city
  const areaPattern = /\s+(bay\s+area|area|metropolitan\s+area|metro\s+area)$/i;
  const withoutArea = location.replace(areaPattern, '').trim();
  
  // PRIORITY 1: Check for state abbreviations first (like "DC" in "Washington DC-Baltimore Area")
  // This prevents "Washington" from matching the state name "Washington" (WA)
  const words = location.split(/[\s,-]+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const upper = word.toUpperCase();
    if (upper.length === 2 && ABBREVIATION_TO_STATE[upper]) {
      // Found state abbreviation
      // Extract city (everything before the state abbreviation)
      let city = words.slice(0, i).join(' ').trim();
      
      // Remove area suffixes from city
      city = city.replace(areaPattern, '').trim();
      
      return { city: city || null, state: upper, country: null };
    }
  }
  
  // PRIORITY 2: Check for state names in the string
  for (const [stateName, abbr] of Object.entries(STATE_ABBREVIATIONS)) {
    if (lower.includes(stateName)) {
      // Extract city (everything before the state name)
      const stateIndex = lower.indexOf(stateName);
      let city = location.substring(0, stateIndex).trim().replace(/[,-]+$/, '').trim();
      
      // Remove area suffixes from city
      city = city.replace(areaPattern, '').trim();
      
      return { city: city || null, state: abbr, country: null };
    }
  }
  
  // No state found - try to extract city from area format
  // "San Francisco Bay Area" → "San Francisco", CA
  if (areaPattern.test(location)) {
    const city = withoutArea;
    // Try to infer state from well-known cities
    const state = inferStateFromCity(city);
    return { city, state, country: null };
  }
  
  // No state found - return as city
  return { city: location, state: null, country: null };
}

/**
 * Infer state from well-known city names
 */
function inferStateFromCity(city: string): string | null {
  const cityToState: Record<string, string> = {
    'san francisco': 'CA',
    'los angeles': 'LA',
    'new york': 'NY',
    'chicago': 'IL',
    'houston': 'TX',
    'phoenix': 'AZ',
    'philadelphia': 'PA',
    'san antonio': 'TX',
    'san diego': 'CA',
    'dallas': 'TX',
    'san jose': 'CA',
    'austin': 'TX',
    'jacksonville': 'FL',
    'fort worth': 'TX',
    'columbus': 'OH',
    'charlotte': 'NC',
    'indianapolis': 'IN',
    'seattle': 'WA',
    'denver': 'CO',
    'boston': 'MA',
    'washington': 'DC',
    'nashville': 'TN',
    'baltimore': 'MD',
    'portland': 'OR',
    'las vegas': 'NV',
    'detroit': 'MI',
    'memphis': 'TN',
    'louisville': 'KY',
    'milwaukee': 'WI',
    'albuquerque': 'NM',
    'tucson': 'AZ',
    'fresno': 'CA',
    'sacramento': 'CA',
    'mesa': 'AZ',
    'atlanta': 'GA',
    'kansas city': 'MO',
    'colorado springs': 'CO',
    'raleigh': 'NC',
    'omaha': 'NE',
    'miami': 'FL',
    'oakland': 'CA',
    'minneapolis': 'MN',
    'tulsa': 'OK',
    'wichita': 'KS',
    'new orleans': 'LA',
  };
  
  const lower = city.toLowerCase().trim();
  return cityToState[lower] || null;
}

/**
 * Format parsed location as "City, State" (for display)
 */
export function formatLocation(parsed: ParsedLocation): string {
  const parts: string[] = [];
  if (parsed.city) parts.push(parsed.city);
  if (parsed.state) parts.push(parsed.state);
  return parts.join(', ');
}
