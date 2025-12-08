import { searchCities, getCitiesByCounty } from '@mardillu/us-cities-utils';

export interface ZIPRepairResult {
  zip: string;
  confidence: number;
  method: 'city_lookup' | 'county_lookup' | 'address_matching' | 'primary_zip' | 'original' | 'failed';
  original: string;
  needsRepair: boolean;
  suggestions?: string[];
}

export interface DataRow {
  city?: string;
  zip?: string;
  state?: string;
  county?: string;
  address?: string;
}

/**
 * ZIPRepairService - Intelligent ZIP code normalization using context
 * 
 * Repairs missing, incorrect, or invalid ZIP codes by:
 * 1. Using city + state lookup
 * 2. Using county + state lookup
 * 3. Using address matching for multi-ZIP cities
 * 4. Validating and cleaning existing ZIPs
 */
export class ZIPRepairService {
  private static readonly INVALID_ZIPS = [
    '2147483647', // Integer overflow
    'nan',
    '',
    'null',
    'undefined'
  ];

  /**
   * Check if a ZIP code needs repair
   */
  static needsRepair(zip: string | undefined): boolean {
    if (!zip) return true;

    const normalized = zip.trim().toLowerCase();

    // Empty or invalid values
    if (this.INVALID_ZIPS.includes(normalized)) return true;

    // Invalid format (not 5 digits, allowing .0 suffix)
    const cleanZIP = normalized.replace('.0', '');
    if (!/^\d{5}$/.test(cleanZIP)) return true;

    return false;
  }

  /**
   * Repair a ZIP code using context from other fields
   */
  static repair(row: DataRow): ZIPRepairResult {
    const original = row.zip || '';

    // If doesn't need repair, just clean format
    if (!this.needsRepair(original)) {
      const cleaned = this.cleanZIP(original);
      return {
        zip: cleaned,
        confidence: 100,
        method: 'original',
        original,
        needsRepair: false
      };
    }

    // Strategy 1: Use city + state lookup
    if (row.city && row.state && this.isValidCity(row.city)) {
      const zipsForCity = this.getZIPsForCity(row.city, row.state);

      // Single ZIP for city - high confidence
      if (zipsForCity.length === 1) {
        return {
          zip: zipsForCity[0],
          confidence: 95,
          method: 'city_lookup',
          original,
          needsRepair: true
        };
      }

      // Multiple ZIPs - use address to narrow down
      if (zipsForCity.length > 1 && row.address) {
        const bestZIP = this.findBestZIPForAddress(row.address, zipsForCity);
        if (bestZIP) {
          return {
            zip: bestZIP,
            confidence: 80,
            method: 'address_matching',
            original,
            needsRepair: true,
            suggestions: zipsForCity
          };
        }
      }

      // Multiple ZIPs - return primary ZIP for city
      if (zipsForCity.length > 1) {
        return {
          zip: zipsForCity[0], // Primary ZIP (first in list)
          confidence: 70,
          method: 'primary_zip',
          original,
          needsRepair: true,
          suggestions: zipsForCity
        };
      }
    }

    // Strategy 2: Use county + state lookup
    if (row.county && row.state) {
      const zipsInCounty = this.getZIPsInCounty(row.county, row.state);
      if (zipsInCounty.length > 0) {
        return {
          zip: zipsInCounty[0], // First ZIP in county
          confidence: 60,
          method: 'county_lookup',
          original,
          needsRepair: true,
          suggestions: zipsInCounty.slice(0, 5) // Top 5 suggestions
        };
      }
    }

    // Strategy 3: Keep original if valid format (last resort)
    if (/^\d{5}/.test(original)) {
      const cleaned = this.cleanZIP(original);
      return {
        zip: cleaned,
        confidence: 50,
        method: 'original',
        original,
        needsRepair: true
      };
    }

    // Strategy 4: Unable to repair
    return {
      zip: '',
      confidence: 0,
      method: 'failed',
      original,
      needsRepair: true
    };
  }

  /**
   * Clean ZIP code format (remove .0 suffix, trim)
   */
  private static cleanZIP(zip: string): string {
    return zip.trim().replace('.0', '').substring(0, 5);
  }

  /**
   * Check if city name is valid (not a ZIP code or incomplete)
   */
  private static isValidCity(city: string): boolean {
    const normalized = city.trim().toLowerCase();

    // Empty or NaN
    if (!normalized || normalized === 'nan') return false;

    // Contains only digits (ZIP code in city field)
    if (/^\d+$/.test(normalized)) return false;

    // Too short
    if (normalized.length <= 2) return false;

    return true;
  }

  /**
   * Get all ZIP codes for a city using @mardillu/us-cities-utils
   */
  private static getZIPsForCity(city: string, state: string): string[] {
    try {
      // Search for cities matching the name
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
   * Get all ZIP codes in a county using @mardillu/us-cities-utils
   */
  private static getZIPsInCounty(county: string, state: string): string[] {
    try {
      const cities = getCitiesByCounty(county);
      if (!Array.isArray(cities)) return [];

      // Extract all ZIPs from cities in this county
      const zips = cities.map((c: any) => c.zip);
      return [...new Set(zips)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }

  /**
   * Find the best ZIP code for an address from multiple options
   * Uses simple heuristics based on street number ranges
   */
  private static findBestZIPForAddress(address: string, zipOptions: string[]): string | null {
    if (!address || zipOptions.length === 0) return null;

    // Extract street number from address
    const streetNumberMatch = address.match(/^\d+/);
    if (!streetNumberMatch) {
      // No street number, return first ZIP
      return zipOptions[0];
    }

    const streetNumber = parseInt(streetNumberMatch[0], 10);

    // Simple heuristic: lower street numbers often correspond to earlier ZIPs
    // This is a rough approximation and could be improved with actual ZIP boundary data
    if (streetNumber < 1000) {
      return zipOptions[0]; // First ZIP (often downtown/central)
    } else if (streetNumber < 5000) {
      return zipOptions[Math.min(1, zipOptions.length - 1)]; // Second ZIP
    } else {
      return zipOptions[Math.min(2, zipOptions.length - 1)]; // Third ZIP or last
    }
  }

  /**
   * Batch repair multiple rows
   */
  static batchRepair(rows: DataRow[]): ZIPRepairResult[] {
    return rows.map(row => this.repair(row));
  }

  /**
   * Get repair statistics
   */
  static getRepairStats(results: ZIPRepairResult[]): {
    total: number;
    repaired: number;
    failed: number;
    byMethod: Record<string, number>;
    averageConfidence: number;
  } {
    const repaired = results.filter(r => r.needsRepair && r.method !== 'failed');
    const failed = results.filter(r => r.method === 'failed');
    const byMethod: Record<string, number> = {};

    results.forEach(r => {
      byMethod[r.method] = (byMethod[r.method] || 0) + 1;
    });

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    return {
      total: results.length,
      repaired: repaired.length,
      failed: failed.length,
      byMethod,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    };
  }
}
