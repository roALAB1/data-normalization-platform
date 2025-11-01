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

export class LocationNormalizer {
  static normalize(location: string): string {
    if (!location) return '';
    let normalized = location.trim();
    for (const pattern of COUNTRY_PATTERNS) {
      normalized = normalized.replace(pattern, '');
    }
    const parts = normalized.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    const lastPart = parts[parts.length - 1];
    const stateLower = lastPart.toLowerCase();
    if (lastPart.length === 2 && lastPart === lastPart.toUpperCase()) {
      return parts.join(', ');
    }
    const stateAbbr = STATE_ABBREVIATIONS[stateLower];
    if (stateAbbr) {
      parts[parts.length - 1] = stateAbbr;
    }
    return parts.join(', ');
  }
}
