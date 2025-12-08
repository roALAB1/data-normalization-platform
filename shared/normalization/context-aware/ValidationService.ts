import { getCity, searchCities } from '@mardillu/us-cities-utils';

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  issues: string[];
  suggestedCity?: string;
  suggestedZIP?: string;
  suggestedZIPs?: string[];
}

export interface DataRow {
  city?: string;
  zip?: string;
  state?: string;
  county?: string;
}

/**
 * ValidationService - Cross-validate city and ZIP code matches
 * 
 * Validates that city names and ZIP codes are consistent and correct:
 * 1. Checks if ZIP code matches the city
 * 2. Checks if city matches the ZIP code
 * 3. Provides suggestions for mismatches
 * 4. Calculates confidence scores
 */
export class ValidationService {
  /**
   * Validate that city and ZIP code match
   */
  static validateCityZIPMatch(row: DataRow): ValidationResult {
    const { city, zip, state, county } = row;

    // Missing required fields
    if (!city || !zip || !state) {
      return {
        valid: false,
        confidence: 0,
        issues: ['missing_required_fields']
      };
    }

    // Clean inputs
    const cleanCity = city.trim();
    const cleanZIP = zip.trim().replace('.0', '');
    const cleanState = state.trim().toUpperCase();

    // Validate ZIP format
    if (!/^\d{5}$/.test(cleanZIP)) {
      return {
        valid: false,
        confidence: 0,
        issues: ['invalid_zip_format']
      };
    }

    // Get city from ZIP
    const cityFromZIP = this.getCityFromZIP(cleanZIP);
    if (!cityFromZIP) {
      return {
        valid: false,
        confidence: 0,
        issues: ['zip_not_found'],
        suggestedCity: undefined
      };
    }

    // Get ZIPs for city
    const zipsForCity = this.getZIPsForCity(cleanCity, cleanState);

    // Perfect match
    if (this.normalizeCity(cityFromZIP) === this.normalizeCity(cleanCity) && 
        zipsForCity.includes(cleanZIP)) {
      return {
        valid: true,
        confidence: 100,
        issues: []
      };
    }

    // City matches but case differs
    if (this.normalizeCity(cityFromZIP) === this.normalizeCity(cleanCity)) {
      return {
        valid: true,
        confidence: 95,
        issues: ['case_mismatch'],
        suggestedCity: cityFromZIP
      };
    }

    // ZIP is valid for city but not primary
    if (zipsForCity.includes(cleanZIP)) {
      return {
        valid: true,
        confidence: 90,
        issues: ['secondary_zip']
      };
    }

    // ZIP exists but doesn't match city
    if (cityFromZIP && zipsForCity.length > 0) {
      return {
        valid: false,
        confidence: 0,
        issues: ['city_zip_mismatch'],
        suggestedCity: cityFromZIP,
        suggestedZIP: zipsForCity[0],
        suggestedZIPs: zipsForCity
      };
    }

    // City not found in database
    if (zipsForCity.length === 0) {
      return {
        valid: false,
        confidence: 0,
        issues: ['city_not_found'],
        suggestedCity: cityFromZIP,
        suggestedZIP: cleanZIP
      };
    }

    // Unknown issue
    return {
      valid: false,
      confidence: 0,
      issues: ['unknown_validation_error']
    };
  }

  /**
   * Validate ZIP code format and existence
   */
  static validateZIP(zip: string): boolean {
    if (!zip) return false;

    const cleanZIP = zip.trim().replace('.0', '');
    
    // Check format
    if (!/^\d{5}$/.test(cleanZIP)) return false;

    // Check if ZIP exists in database
    try {
      const result = getCity(cleanZIP);
      return result !== null && result !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate city name format
   */
  static validateCityFormat(city: string): boolean {
    if (!city) return false;

    const normalized = city.trim().toLowerCase();

    // Empty or NaN
    if (!normalized || normalized === 'nan') return false;

    // Contains digits
    if (/\d/.test(normalized)) return false;

    // Too short
    if (normalized.length < 2) return false;

    return true;
  }

  /**
   * Get city from ZIP code using @mardillu/us-cities-utils
   */
  private static getCityFromZIP(zip: string): string | null {
    try {
      const result = getCity(zip);
      return result?.name || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all ZIP codes for a city using @mardillu/us-cities-utils
   */
  private static getZIPsForCity(city: string, state: string): string[] {
    try {
      const cities = searchCities(city);
      if (!Array.isArray(cities)) return [];

      // Filter by state and extract ZIPs
      const zips = cities
        .filter((c: any) => c.stateAbbr === state && c.name.toLowerCase() === city.toLowerCase())
        .map((c: any) => c.zip);

      return [...new Set(zips)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }

  /**
   * Normalize city name for comparison (lowercase, trim)
   */
  private static normalizeCity(city: string): string {
    return city.trim().toLowerCase();
  }

  /**
   * Batch validate multiple rows
   */
  static batchValidate(rows: DataRow[]): ValidationResult[] {
    return rows.map(row => this.validateCityZIPMatch(row));
  }

  /**
   * Get validation statistics
   */
  static getValidationStats(results: ValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    byIssue: Record<string, number>;
    averageConfidence: number;
  } {
    const valid = results.filter(r => r.valid);
    const invalid = results.filter(r => !r.valid);
    const byIssue: Record<string, number> = {};

    results.forEach(r => {
      r.issues.forEach(issue => {
        byIssue[issue] = (byIssue[issue] || 0) + 1;
      });
    });

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    return {
      total: results.length,
      valid: valid.length,
      invalid: invalid.length,
      byIssue,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    };
  }

  /**
   * Get human-readable issue descriptions
   */
  static getIssueDescription(issue: string): string {
    const descriptions: Record<string, string> = {
      'missing_required_fields': 'Missing required fields (city, ZIP, or state)',
      'invalid_zip_format': 'ZIP code format is invalid (must be 5 digits)',
      'zip_not_found': 'ZIP code not found in database',
      'case_mismatch': 'City name case differs from standard format',
      'secondary_zip': 'ZIP code is valid but not the primary ZIP for this city',
      'city_zip_mismatch': 'City and ZIP code do not match',
      'city_not_found': 'City not found in database',
      'unknown_validation_error': 'Unknown validation error'
    };

    return descriptions[issue] || issue;
  }
}
