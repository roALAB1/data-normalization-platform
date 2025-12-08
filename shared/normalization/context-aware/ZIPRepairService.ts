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

  // Fallback ZIP lookup for common Texas cities (primary ZIP codes)
  private static readonly TEXAS_CITY_ZIPS: Record<string, string> = {
    'austin': '78701',
    'houston': '77001',
    'dallas': '75201',
    'san antonio': '78201',
    'fort worth': '76101',
    'el paso': '79901',
    'arlington': '76010',
    'corpus christi': '78401',
    'plano': '75023',
    'laredo': '78040',
    'lubbock': '79401',
    'garland': '75040',
    'irving': '75060',
    'amarillo': '79101',
    'grand prairie': '75050',
    'brownsville': '78520',
    'mckinney': '75069',
    'frisco': '75034',
    'pasadena': '77501',
    'mesquite': '75149',
    'killeen': '76540',
    'carrollton': '75006',
    'midland': '79701',
    'waco': '76701',
    'denton': '76201',
    'abilene': '79601',
    'beaumont': '77701',
    'round rock': '78664',
    'odessa': '79760',
    'richardson': '75080',
    'tyler': '75701',
    'lewisville': '75029',
    'college station': '77840',
    'san angelo': '76901',
    'allen': '75002',
    'league city': '77573',
    'sugar land': '77478',
    'longview': '75601',
    'edinburg': '78539',
    'mission': '78572',
    'bryan': '77801',
    'baytown': '77520',
    'pharr': '78577',
    'temple': '76501',
    'missouri city': '77459',
    'flower mound': '75022',
    'harlingen': '78550',
    'north richland hills': '76180',
    'victoria': '77901',
    'conroe': '77301',
    'new braunfels': '78130',
    'mansfield': '76063',
    'cedar park': '78613',
    'rowlett': '75088',
    'port arthur': '77640',
    'euless': '76039',
    'georgetown': '78626',
    'pflugerville': '78660',
    'desoto': '75115',
    'san marcos': '78666',
    'grapevine': '76051',
    'bedford': '76021',
    'galveston': '77550',
    'cedar hill': '75104',
    'texas city': '77590',
    'wylie': '75098',
    'haltom city': '76117',
    'keller': '76244',
    'coppell': '75019',
    'rockwall': '75087',
    'huntsville': '77340',
    'duncanville': '75116',
    'sherman': '75090',
    'the colony': '75056',
    'burleson': '76028',
    'hurst': '76053',
    'lancaster': '75134',
    'texarkana': '75501',
    'friendswood': '77546',
    'weslaco': '78596',
    'the woodlands': '77380',
    'wichita falls': '76301',
    'southlake': '76092',
    'pearland': '77581',
    'atascocita': '77346',
    'little elm': '75068',
    'spring': '77373',
    'stafford': '77477',
    'webster': '77598',
    'gainesville': '76240',
    'pittsburg': '75686',
    'fredericksburg': '78624',
    'blanco': '78606',
    'caldwell': '77836',
    'seven points': '75143',
    'south padre island': '78597',
    's padre island': '78597',
    'monte alto': '78538',
    'collin county': '75002',  // Use Allen as default for Collin County
    'denton county': '76201',  // Use Denton as default
  };

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
  static async repair(row: DataRow): Promise<ZIPRepairResult> {
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

    // Strategy 2.5: Try fallback lookup table for Texas cities
    if (row.city && row.state && row.state.toUpperCase() === 'TX') {
      const cityKey = row.city.toLowerCase().trim();
      const zipFromTable = this.TEXAS_CITY_ZIPS[cityKey];
      
      if (zipFromTable) {
        return {
          zip: zipFromTable,
          confidence: 90,
          method: 'city_lookup',
          original,
          needsRepair: true
        };
      }
    }

    // Strategy 2.6: Try external API as last resort (disabled due to fetch hanging issues)
    // if (row.city && row.state && this.isValidCity(row.city)) {
    //   try {
    //     const zipFromAPI = await this.getZIPFromExternalAPI(row.city, row.state);
    //     if (zipFromAPI) {
    //       return {
    //         zip: zipFromAPI,
    //         confidence: 85,
    //         method: 'city_lookup',
    //         original,
    //         needsRepair: true
    //       };
    //     }
    //   } catch (error) {
    //     // API failed, continue to next strategy
    //   }
    // }

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
   * Normalize city name for better API matching
   */
  private static normalizeCityName(city: string): string {
    return city
      .trim()
      .toLowerCase()
      // Expand common abbreviations
      .replace(/^s\s+/i, 'south ')
      .replace(/^n\s+/i, 'north ')
      .replace(/^e\s+/i, 'east ')
      .replace(/^w\s+/i, 'west ')
      .replace(/\s+st$/i, ' saint')
      .replace(/\s+mt$/i, ' mount');
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
   * Get ZIP code from external API (Zippopotam.us - free, no API key)
   */
  private static async getZIPFromExternalAPI(city: string, state: string): Promise<string | null> {
    try {
      // Normalize city name first (expand abbreviations)
      const normalizedCity = this.normalizeCityName(city);
      
      // Try Zippopotam.us API (free, no key required)
      // Format: http://api.zippopotam.us/us/{state}/{city}
      const stateCode = state.toLowerCase();
      const cityName = encodeURIComponent(normalizedCity);
      const url = `http://api.zippopotam.us/us/${stateCode}/${cityName}`;
      
      const DEBUG = process.env.DEBUG_ZIP_REPAIR === 'true';
      if (DEBUG) console.log(`[ZIP Repair] Fetching: ${url}`);
      
      const response = await fetch(url);
      
      if (DEBUG) console.log(`[ZIP Repair] Response status: ${response.status}`);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (DEBUG) console.log(`[ZIP Repair] Response data:`, JSON.stringify(data).substring(0, 200));
      
      // Return the first ZIP code found
      if (data && data.places && Array.isArray(data.places) && data.places.length > 0) {
        const zip = data.places[0]['post code'];
        if (DEBUG) console.log(`[ZIP Repair] Extracted ZIP: ${zip}`);
        return zip;
      }
      
      return null;
    } catch (error) {
      const DEBUG = process.env.DEBUG_ZIP_REPAIR === 'true';
      if (DEBUG) console.error(`[ZIP Repair] Exception:`, error);
      // API call failed, return null
      return null;
    }
  }

  /**
   * Batch repair multiple rows
   */
  static async batchRepair(rows: DataRow[]): Promise<ZIPRepairResult[]> {
    return Promise.all(rows.map(row => this.repair(row)));
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
