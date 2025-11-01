/**
 * AddressFormatter - Simple address format standardization
 * 
 * Converts addresses to Title Case and abbreviates street suffixes.
 * Does NOT validate addresses or check if they exist.
 * 
 * Use cases:
 * - Format standardization for data enrichment APIs
 * - Cleaning inconsistent address data (ALL CAPS, mixed case)
 * - Abbreviating street types for consistency
 * 
 * NOT for:
 * - Address validation (use Radar API, Google Address API, or USPS)
 * - Geocoding (getting lat/lng coordinates)
 * - Typo correction
 * - International address parsing
 */

export interface AddressFormatterOptions {
  /**
   * Abbreviate directional prefixes/suffixes (North → N, South → S, etc.)
   * Default: false
   */
  abbreviateDirectionals?: boolean;

  /**
   * Abbreviate unit types (Apartment → Apt, Suite → Ste, etc.)
   * Default: false
   */
  abbreviateUnits?: boolean;

  /**
   * Custom suffix mappings to override defaults
   */
  customSuffixMap?: Record<string, string>;
}

export interface AddressFormatterResult {
  original: string;
  normalized: string;
  changes: string[];
}

export class AddressFormatter {
  // Street suffix abbreviations (USPS standard)
  private static readonly SUFFIX_MAP: Record<string, string> = {
    'Street': 'St',
    'Avenue': 'Ave',
    'Boulevard': 'Blvd',
    'Place': 'Pl',
    'Road': 'Rd',
    'Drive': 'Dr',
    'Court': 'Ct',
    'Lane': 'Ln',
    'Terrace': 'Ter',
    'Parkway': 'Pkwy',
    'Circle': 'Cir',
    'Trail': 'Trl',
    'Way': 'Way',
    'Square': 'Sq',
    'Alley': 'Aly',
    'Center': 'Ctr',
    'Highway': 'Hwy',
    'Expressway': 'Expy',
    'Freeway': 'Fwy',
    'Plaza': 'Plz',
    'Point': 'Pt',
    'Ridge': 'Rdg',
    'Loop': 'Loop',
    'Path': 'Path',
    'Pike': 'Pike',
    'Run': 'Run',
    'Walk': 'Walk'
  };

  // Directional abbreviations
  private static readonly DIRECTIONAL_MAP: Record<string, string> = {
    'North': 'N',
    'South': 'S',
    'East': 'E',
    'West': 'W',
    'Northeast': 'NE',
    'Northwest': 'NW',
    'Southeast': 'SE',
    'Southwest': 'SW'
  };

  // Unit type abbreviations
  private static readonly UNIT_MAP: Record<string, string> = {
    'Apartment': 'Apt',
    'Suite': 'Ste',
    'Unit': 'Unit',
    'Building': 'Bldg',
    'Floor': 'Fl',
    'Room': 'Rm',
    'Department': 'Dept'
  };

  // Acronyms to keep uppercase (not Title Case)
  private static readonly ACRONYMS = ['PO', 'APO', 'FPO', 'DPO', 'PMB'];

  /**
   * Convert string to Title Case with acronym handling
   * Example: "143 WEST SIDLEE STREET" → "143 West Sidlee Street"
   * Example: "PO BOX 123" → "PO Box 123" (not "Po Box 123")
   */
  private static toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Keep acronyms uppercase
        if (this.ACRONYMS.includes(word.toUpperCase())) {
          return word.toUpperCase();
        }
        // Title case for regular words
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Abbreviate street suffixes (only last word before unit/secondary address)
   * Example: "143 West Sidlee Street" → "143 West Sidlee St"
   * Example: "143 Main Street Apt 5" → "143 Main St Apt 5"
   */
  private static abbreviateSuffixes(
    address: string,
    customMap?: Record<string, string>
  ): string {
    const suffixMap = customMap || this.SUFFIX_MAP;
    const words = address.split(' ');
    
    if (words.length === 0) return address;

    // Find the last word that could be a suffix (before unit indicators)
    let suffixIndex = words.length - 1;
    
    // Check if there's a unit indicator (Apt, Suite, Unit, #, etc.)
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (this.UNIT_MAP[word] || word === '#' || word === 'Apt' || word === 'Ste') {
        suffixIndex = i - 1;
        break;
      }
    }

    if (suffixIndex < 0) return address;

    const potentialSuffix = words[suffixIndex];

    // Check if it's a suffix and abbreviate
    for (const [full, abbr] of Object.entries(suffixMap)) {
      if (potentialSuffix.toLowerCase() === full.toLowerCase()) {
        words[suffixIndex] = abbr;
        break;
      }
    }

    return words.join(' ');
  }

  /**
   * Abbreviate directional words
   * Example: "143 North Main Street" → "143 N Main St"
   */
  private static abbreviateDirectionals(address: string): string {
    let result = address;
    
    for (const [full, abbr] of Object.entries(this.DIRECTIONAL_MAP)) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      result = result.replace(regex, abbr);
    }
    
    return result;
  }

  /**
   * Abbreviate unit types
   * Example: "143 Main St Apartment 5" → "143 Main St Apt 5"
   */
  private static abbreviateUnits(address: string): string {
    let result = address;
    
    for (const [full, abbr] of Object.entries(this.UNIT_MAP)) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      result = result.replace(regex, abbr);
    }
    
    return result;
  }

  /**
   * Normalize address to Title Case with abbreviated suffixes
   * 
   * @param address - The address string to normalize
   * @param options - Optional formatting options
   * @returns Normalized address string
   * 
   * @example
   * AddressFormatter.normalize('143 WEST SIDLEE STREET')
   * // Returns: "143 West Sidlee St"
   * 
   * @example
   * AddressFormatter.normalize('456 NORTH MAIN AVENUE APT 5', {
   *   abbreviateDirectionals: true,
   *   abbreviateUnits: true
   * })
   * // Returns: "456 N Main Ave Apt 5"
   */
  static normalize(
    address: string,
    options?: AddressFormatterOptions
  ): string {
    if (!address || address.trim() === '') {
      return address; // Return empty/blank as-is
    }

    // Step 1: Convert to Title Case
    let normalized = this.toTitleCase(address.trim());

    // Step 2: Abbreviate street suffixes
    normalized = this.abbreviateSuffixes(normalized, options?.customSuffixMap);

    // Step 3: Abbreviate directionals (optional)
    if (options?.abbreviateDirectionals) {
      normalized = this.abbreviateDirectionals(normalized);
    }

    // Step 4: Abbreviate unit types (optional)
    if (options?.abbreviateUnits) {
      normalized = this.abbreviateUnits(normalized);
    }

    return normalized;
  }

  /**
   * Normalize address with detailed change tracking
   * 
   * @param address - The address string to normalize
   * @param options - Optional formatting options
   * @returns Object with original, normalized, and list of changes
   * 
   * @example
   * AddressFormatter.normalizeWithDetails('143 WEST SIDLEE STREET')
   * // Returns: {
   * //   original: '143 WEST SIDLEE STREET',
   * //   normalized: '143 West Sidlee St',
   * //   changes: ['Converted to Title Case', 'Abbreviated Street → St']
   * // }
   */
  static normalizeWithDetails(
    address: string,
    options?: AddressFormatterOptions
  ): AddressFormatterResult {
    const original = address;
    const changes: string[] = [];

    if (!address || address.trim() === '') {
      return { original, normalized: address, changes };
    }

    // Track changes
    let current = address.trim();

    // Step 1: Title Case
    const titleCased = this.toTitleCase(current);
    if (titleCased !== current) {
      changes.push('Converted to Title Case');
      current = titleCased;
    }

    // Step 2: Suffix abbreviation
    const suffixAbbreviated = this.abbreviateSuffixes(current, options?.customSuffixMap);
    if (suffixAbbreviated !== current) {
      // Find which suffix was abbreviated
      const words = current.split(' ');
      const newWords = suffixAbbreviated.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (words[i] !== newWords[i]) {
          changes.push(`Abbreviated ${words[i]} → ${newWords[i]}`);
        }
      }
      current = suffixAbbreviated;
    }

    // Step 3: Directional abbreviation
    if (options?.abbreviateDirectionals) {
      const directionalAbbreviated = this.abbreviateDirectionals(current);
      if (directionalAbbreviated !== current) {
        changes.push('Abbreviated directionals (N, S, E, W)');
        current = directionalAbbreviated;
      }
    }

    // Step 4: Unit abbreviation
    if (options?.abbreviateUnits) {
      const unitAbbreviated = this.abbreviateUnits(current);
      if (unitAbbreviated !== current) {
        changes.push('Abbreviated unit types (Apt, Ste, etc.)');
        current = unitAbbreviated;
      }
    }

    return {
      original,
      normalized: current,
      changes
    };
  }

  /**
   * Batch normalize addresses from CSV
   * 
   * @param addresses - Array of address strings
   * @param options - Optional formatting options
   * @returns Array of normalized address strings
   * 
   * @example
   * const addresses = [
   *   '143 WEST SIDLEE STREET',
   *   '456 MAIN AVENUE',
   *   '789 OAK BOULEVARD'
   * ];
   * const normalized = AddressFormatter.normalizeBatch(addresses);
   * // Returns: ["143 West Sidlee St", "456 Main Ave", "789 Oak Blvd"]
   */
  static normalizeBatch(
    addresses: string[],
    options?: AddressFormatterOptions
  ): string[] {
    return addresses.map(addr => this.normalize(addr, options));
  }

  /**
   * Batch normalize with detailed results
   * 
   * @param addresses - Array of address strings
   * @param options - Optional formatting options
   * @returns Array of detailed results with changes tracked
   */
  static normalizeBatchWithDetails(
    addresses: string[],
    options?: AddressFormatterOptions
  ): AddressFormatterResult[] {
    return addresses.map(addr => this.normalizeWithDetails(addr, options));
  }

  /**
   * Get all available suffix abbreviations
   */
  static getSuffixMap(): Record<string, string> {
    return { ...this.SUFFIX_MAP };
  }

  /**
   * Get all available directional abbreviations
   */
  static getDirectionalMap(): Record<string, string> {
    return { ...this.DIRECTIONAL_MAP };
  }

  /**
   * Get all available unit type abbreviations
   */
  static getUnitMap(): Record<string, string> {
    return { ...this.UNIT_MAP };
  }
}
