import { getCity, getCitiesByCounty } from '@mardillu/us-cities-utils';

export interface CityRepairResult {
  city: string;
  confidence: number;
  method: 'zip_lookup' | 'county_lookup' | 'partial_match' | 'title_case' | 'original';
  original: string;
  needsRepair: boolean;
}

export interface DataRow {
  city?: string;
  zip?: string;
  state?: string;
  county?: string;
  address?: string;
}

/**
 * CityRepairService - Intelligent city name normalization using context
 * 
 * Repairs incomplete, incorrect, or improperly formatted city names by:
 * 1. Using ZIP code lookup
 * 2. Using county + state lookup
 * 3. Expanding partial matches (e.g., "san" → "San Antonio")
 * 4. Normalizing case (e.g., "houston" → "Houston")
 */
export class CityRepairService {
  private static readonly INCOMPLETE_PATTERNS = [
    'san', 'fort', 'ft', 'el', 'mc', 'del', 'new', 'big', 'mt', 'st'
  ];

  private static readonly PARTIAL_MATCH_MAP: Record<string, Record<string, string>> = {
    'TX': {
      'san_Bexar': 'San Antonio',
      'san_Tom Green': 'San Angelo',
      'fort_Tarrant': 'Fort Worth',
      'fort_Denton': 'Fort Worth',
      'el_El Paso': 'El Paso',
    }
  };

  /**
   * Check if a city name needs repair
   */
  static needsRepair(city: string | undefined): boolean {
    if (!city) return true;

    const normalized = city.trim().toLowerCase();

    // Empty or NaN
    if (!normalized || normalized === 'nan') return true;

    // Contains digits (e.g., "76102" - ZIP code in city field)
    if (/\d/.test(normalized)) return true;

    // Too short (e.g., "san", "el", "ft")
    if (normalized.length <= 3) return true;

    // Known incomplete patterns
    if (this.INCOMPLETE_PATTERNS.includes(normalized)) return true;

    return false;
  }

  /**
   * Repair a city name using context from other fields
   */
  static repair(row: DataRow): CityRepairResult {
    const original = row.city || '';

    // If doesn't need repair, just normalize case
    if (!this.needsRepair(original)) {
      return {
        city: this.toTitleCase(original),
        confidence: 100,
        method: 'original',
        original,
        needsRepair: false
      };
    }

    // Strategy 1: Use ZIP code lookup
    if (row.zip && this.isValidZIP(row.zip)) {
      const cityFromZIP = this.getCityFromZIP(row.zip);
      if (cityFromZIP) {
        return {
          city: cityFromZIP,
          confidence: 100,
          method: 'zip_lookup',
          original,
          needsRepair: true
        };
      }
    }

    // Strategy 2: Use county + state lookup
    if (row.county && row.state) {
      const citiesInCounty = this.getCitiesInCounty(row.county, row.state);
      if (citiesInCounty.length === 1) {
        return {
          city: citiesInCounty[0],
          confidence: 90,
          method: 'county_lookup',
          original,
          needsRepair: true
        };
      }
    }

    // Strategy 3: Partial match expansion
    const partialMatch = this.expandPartialMatch(original, row.county, row.state);
    if (partialMatch) {
      return {
        city: partialMatch,
        confidence: 85,
        method: 'partial_match',
        original,
        needsRepair: true
      };
    }

    // Strategy 4: Title case normalization (fallback)
    return {
      city: this.toTitleCase(original),
      confidence: 50,
      method: 'title_case',
      original,
      needsRepair: true
    };
  }

  /**
   * Validate ZIP code format
   */
  private static isValidZIP(zip: string): boolean {
    const normalized = zip.trim().replace('.0', '');
    return /^\d{5}$/.test(normalized);
  }

  /**
   * Get city name from ZIP code using @mardillu/us-cities-utils
   */
  private static getCityFromZIP(zip: string): string | null {
    try {
      const normalized = zip.trim().replace('.0', '');
      const result = getCity(normalized);
      return result?.name || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all cities in a county using @mardillu/us-cities-utils
   */
  private static getCitiesInCounty(county: string, state: string): string[] {
    try {
      const result = getCitiesByCounty(county);
      if (!Array.isArray(result)) return [];
      
      // Extract unique city names
      const uniqueCities = [...new Set(result.map((city: any) => city.name))];
      return uniqueCities;
    } catch (error) {
      return [];
    }
  }

  /**
   * Expand partial city names using county context
   * Example: "san" + "Bexar" → "San Antonio"
   */
  private static expandPartialMatch(
    city: string,
    county: string | undefined,
    state: string | undefined
  ): string | null {
    if (!city || !county || !state) return null;

    const normalized = city.trim().toLowerCase();
    const key = `${normalized}_${county}`;
    const stateMap = this.PARTIAL_MATCH_MAP[state];

    if (stateMap && stateMap[key]) {
      return stateMap[key];
    }

    return null;
  }

  /**
   * Convert string to title case
   * Example: "houston" → "Houston", "SAN ANTONIO" → "San Antonio"
   */
  private static toTitleCase(str: string): string {
    if (!str) return '';

    return str
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Handle special cases
        if (word === 'mc' || word === 'mac') {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Batch repair multiple rows
   */
  static batchRepair(rows: DataRow[]): CityRepairResult[] {
    return rows.map(row => this.repair(row));
  }

  /**
   * Get repair statistics
   */
  static getRepairStats(results: CityRepairResult[]): {
    total: number;
    repaired: number;
    byMethod: Record<string, number>;
    averageConfidence: number;
  } {
    const repaired = results.filter(r => r.needsRepair);
    const byMethod: Record<string, number> = {};

    results.forEach(r => {
      byMethod[r.method] = (byMethod[r.method] || 0) + 1;
    });

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    return {
      total: results.length,
      repaired: repaired.length,
      byMethod,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    };
  }
}
