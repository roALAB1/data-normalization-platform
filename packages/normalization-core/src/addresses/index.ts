/**
 * Address Normalization Library
 * 
 * Comprehensive data and utilities for normalizing postal addresses.
 * 
 * TODO: Implement address-specific normalization data:
 * - Street type abbreviations (St., Ave., Blvd., etc.)
 * - Directional abbreviations (N, S, E, W, NE, SW, etc.)
 * - Unit designators (Apt., Suite, Unit, #, etc.)
 * - State/Province abbreviations
 * - Country codes (ISO 3166)
 * - Postal code formats by country
 * - Address parsing patterns
 */

// US Street type abbreviations
export const STREET_TYPES: Record<string, string> = {
  'Street': 'St',
  'Avenue': 'Ave',
  'Boulevard': 'Blvd',
  'Drive': 'Dr',
  'Road': 'Rd',
  'Lane': 'Ln',
  'Court': 'Ct',
  'Circle': 'Cir',
  'Place': 'Pl',
  'Terrace': 'Ter',
  'Way': 'Way',
  'Parkway': 'Pkwy',
  'Highway': 'Hwy',
  // ... more street types
};

// Directional abbreviations
export const DIRECTIONALS: Record<string, string> = {
  'North': 'N',
  'South': 'S',
  'East': 'E',
  'West': 'W',
  'Northeast': 'NE',
  'Northwest': 'NW',
  'Southeast': 'SE',
  'Southwest': 'SW',
};

// Unit designators
export const UNIT_DESIGNATORS = new Set([
  'Apt',
  'Apartment',
  'Suite',
  'Ste',
  'Unit',
  'Bldg',
  'Building',
  'Floor',
  'Fl',
  'Room',
  'Rm',
  '#',
]);

// US State abbreviations
export const US_STATES: Record<string, string> = {
  'Alabama': 'AL',
  'Alaska': 'AK',
  'Arizona': 'AZ',
  'Arkansas': 'AR',
  'California': 'CA',
  'Colorado': 'CO',
  'Connecticut': 'CT',
  'Delaware': 'DE',
  'Florida': 'FL',
  'Georgia': 'GA',
  // ... more states
};

/**
 * Abbreviate street type
 */
export function abbreviateStreetType(streetType: string): string {
  return STREET_TYPES[streetType] || streetType;
}

/**
 * Abbreviate directional
 */
export function abbreviateDirectional(directional: string): string {
  return DIRECTIONALS[directional] || directional;
}

/**
 * Check if a string is a unit designator
 */
export function isUnitDesignator(str: string): boolean {
  return UNIT_DESIGNATORS.has(str.replace(/\./g, ''));
}
