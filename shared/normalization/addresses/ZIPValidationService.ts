/**
 * ZIP Code Validation Service
 * 
 * Uses @mardillu/us-cities-utils to validate ZIP codes and extract city/state information
 * Provides O(1) lookups for ZIP code validation and state matching
 */

import { getCity } from '@mardillu/us-cities-utils';

export interface ZIPLookupResult {
  zip: string;
  city: string;
  state: string;
  county?: string;
  latitude?: number;
  longitude?: number;
}

export class ZIPValidationService {
  /**
   * Look up city and state information for a given ZIP code
   * 
   * @param zip - 5-digit ZIP code (or ZIP+4 format)
   * @returns ZIPLookupResult with city/state info, or null if not found
   */
  static lookup(zip: string): ZIPLookupResult | null {
    try {
      // Handle ZIP+4 format (e.g., "62701-1234" → "62701")
      const cleanZip = zip.split('-')[0].trim();
      
      // Validate format
      if (!/^\d{5}$/.test(cleanZip)) {
        return null;
      }
      
      const cityData = getCity(cleanZip);
      if (!cityData) {
        return null;
      }
      
      return {
        zip: cleanZip,
        city: cityData.name,
        state: cityData.stateAbbr,
        county: cityData.county,
        latitude: cityData.latitude,
        longitude: cityData.longitude
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Validate that a ZIP code matches the given state
   * 
   * @param zip - 5-digit ZIP code
   * @param state - 2-letter state abbreviation
   * @returns true if ZIP belongs to state, false otherwise
   */
  static validateZIPState(zip: string, state: string): boolean {
    try {
      const cleanZip = zip.split('-')[0].trim();
      const cleanState = state.toUpperCase().trim();
      
      const result = this.lookup(cleanZip);
      if (!result) {
        return false;
      }
      
      return result.state === cleanState;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get state abbreviation from a ZIP code
   * 
   * @param zip - 5-digit ZIP code
   * @returns 2-letter state abbreviation, or empty string if not found
   */
  static getStateFromZIP(zip: string): string {
    try {
      const result = this.lookup(zip);
      return result?.state || '';
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Check if a ZIP code is valid
   * 
   * @param zip - 5-digit ZIP code
   * @returns true if ZIP code exists in database
   */
  static isValidZIP(zip: string): boolean {
    return this.lookup(zip) !== null;
  }
}
