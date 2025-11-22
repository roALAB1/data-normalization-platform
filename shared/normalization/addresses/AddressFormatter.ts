/**
 * AddressFormatter - Simple address format standardization
 * 
 * v3.42.0: Enhanced with secondary address stripping and run-on parsing
 * 
 * Converts addresses to Title Case and abbreviates street suffixes.
 * Does NOT validate addresses or check if they exist.
 * 
 * New features:
 * - Strips secondary address components (Apt, Suite, Unit, #, Bldg, etc.)
 * - Parses run-on addresses (city/state embedded without commas)
 * - Handles multiple secondary address formats
 * 
 * Use cases:
 * - Format standardization for data enrichment APIs
 * - Cleaning inconsistent address data (ALL CAPS, mixed case)
 * - Abbreviating street types for consistency
 * - Removing apartment/suite numbers from addresses
 * - Extracting city/state from run-on addresses
 * 
 * NOT for:
 * - Address validation (use Radar API, Google Address API, or USPS)
 * - Geocoding (getting lat/lng coordinates)
 * - Typo correction
 * - International address parsing
 */

import { stripSecondaryAddress, parseRunOnAddress, normalizeAddress } from './AddressParser';

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

/**
 * v3.42.0 CHANGELOG:
 * - Added stripSecondaryAddress() integration for removing Apt/Suite/Unit/# components
 * - Added parseRunOnAddress() integration for extracting city/state from run-on addresses
 * - Updated normalize() to use new AddressParser for comprehensive normalization
 * - Added format() alias for backward compatibility
 * - Added stripSecondary() and parseRunOn() convenience methods
 * 
 * FIXES:
 * - Issue #1: Secondary address components now properly stripped (200+ affected rows)
 * - Issue #2: Run-on addresses with embedded city/state now parsed correctly (50+ affected rows)
 * - Issue #3: Multiple secondary address formats handled (Apt 402, apt i11, #1124, Unit 2, etc.)
 */
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
   * v3.42.0: Now strips secondary addresses and parses run-on addresses
   * 
   * @param address - The address string to normalize
   * @param options - Optional formatting options
   * @returns Normalized address string (street only, no secondary components)
   * 
   * @example
   * AddressFormatter.normalize('143 WEST SIDLEE STREET')
   * // Returns: "143 West Sidlee St"
   * 
   * @example
   * AddressFormatter.normalize('2833 s 115th E. Ave. Apt G')
   * // Returns: "2833 S 115th E Ave" (secondary address stripped)
   * 
   * @example
   * AddressFormatter.normalize('815 S West St Green City MO 63545')
   * // Returns: "815 S West St" (city/state/ZIP extracted)
   * 
   * @example
   * AddressFormatter.normalize('456 NORTH MAIN AVENUE APT 5', {
   *   abbreviateDirectionals: true,
   *   abbreviateUnits: true
   * })
   * // Returns: "456 N Main Ave" (secondary address stripped)
   */
  static normalize(
    address: string,
    options?: AddressFormatterOptions
  ): string {
    if (!address || address.trim() === '') {
      return address; // Return empty/blank as-is
    }

    // v3.42.0: Use new AddressParser for comprehensive normalization
    // This handles:
    // 1. Run-on address parsing (extract street from city/state/ZIP)
    // 2. Secondary address stripping (Apt, Suite, Unit, etc.)
    // 3. Title case conversion
    let normalized = normalizeAddress(address);

    // Step 2: Abbreviate street suffixes
    normalized = this.abbreviateSuffixes(normalized, options?.customSuffixMap);

    // Step 3: Abbreviate directionals (optional)
    if (options?.abbreviateDirectionals) {
      normalized = this.abbreviateDirectionals(normalized);
    }

    // Step 4: Abbreviate unit types (optional) - mostly redundant now since
    // secondary addresses are already stripped, but keep for consistency
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

  /**
   * v3.42.0: Format address (alias for normalize)
   * Kept for backward compatibility
   */
  static format(address: string, options?: AddressFormatterOptions): string {
    return this.normalize(address, options);
  }

  /**
   * v3.42.0: Strip secondary address components only
   * 
   * @param address - Address string
   * @returns Address with secondary components removed
   * 
   * @example
   * AddressFormatter.stripSecondary('123 Main St Apt 5')
   * // Returns: "123 Main St"
   */
  static stripSecondary(address: string): string {
    return stripSecondaryAddress(address);
  }

  /**
   * v3.42.0: Parse run-on address (extract street, city, state, ZIP)
   * 
   * @param address - Address string (may contain city/state/ZIP)
   * @returns Parsed address components
   * 
   * @example
   * AddressFormatter.parseRunOn('815 S West St Green City MO 63545')
   * // Returns: { street: "815 S West St", city: "Green City", state: "MO", zip: "63545" }
   */
  static parseRunOn(address: string) {
    return parseRunOnAddress(address);
  }
}
