/**
 * Location Normalizer
 * Converts "City, State, Country" format to "City, ST" format
 */

const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'washington dc': 'DC'
};

const COUNTRY_PATTERNS = [
  /,?\s*united states$/i,
  /,?\s*usa$/i,
  /,?\s*u\.s\.a\.?$/i,
  /,?\s*us$/i
];

export interface LocationResult {
  city: string;
  state: string;
  original: string;
}

export class LocationNormalizer {
  /**
   * Parse location string and return separate city and state
   * Input: "Los Angeles, California, United States"
   * Output: { city: "Los Angeles", state: "CA", original: "..." }
   */
  static parse(location: string): LocationResult {
    if (!location) return { city: '', state: '', original: location };
    
    // Remove country
    let normalized = location.trim();
    for (const pattern of COUNTRY_PATTERNS) {
      normalized = normalized.replace(pattern, '');
    }
    
    // Split by comma
    const parts = normalized.split(',').map(p => p.trim()).filter(p => p);
    
    if (parts.length === 0) {
      return { city: '', state: '', original: location };
    }
    
    if (parts.length === 1) {
      // Only one part - could be city or state
      return { city: parts[0], state: '', original: location };
    }
    
    // Last part is likely the state
    const lastPart = parts[parts.length - 1];
    const stateLower = lastPart.toLowerCase();
    
    // Check if it's already a 2-letter abbreviation
    let stateAbbr = '';
    if (lastPart.length === 2 && lastPart === lastPart.toUpperCase()) {
      stateAbbr = lastPart;
    } else {
      // Try to find abbreviation
      stateAbbr = STATE_ABBREVIATIONS[stateLower] || lastPart;
    }
    
    // Everything before the last part is the city
    const city = parts.slice(0, -1).join(', ');
    
    return {
      city,
      state: stateAbbr,
      original: location
    };
  }
  
  /**
   * Legacy method for backward compatibility
   * Returns "City, ST" format
   */
  static normalize(location: string): string {
    const result = this.parse(location);
    if (!result.city && !result.state) return '';
    if (!result.state) return result.city;
    return `${result.city}, ${result.state}`;
  }
}
