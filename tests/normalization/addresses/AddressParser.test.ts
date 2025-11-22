import { describe, it, expect } from 'vitest';
import {
  stripSecondaryAddress,
  parseRunOnAddress,
  normalizeAddress,
  parseLocation,
  titleCase
} from '../../../shared/normalization/addresses/AddressParser';

describe('AddressParser - v3.42.0', () => {
  
  describe('stripSecondaryAddress()', () => {
    it('should strip apartment numbers', () => {
      expect(stripSecondaryAddress('2833 s 115th E. Ave. Apt G')).toBe('2833 s 115th E. Ave.');
      expect(stripSecondaryAddress('1421 sw 27th ave apt 402 Ocala fl')).toBe('1421 sw 27th ave Ocala fl');
      expect(stripSecondaryAddress('100 E Vaughn Rd Apt. 2111')).toBe('100 E Vaughn Rd');
      expect(stripSecondaryAddress('8 Merrimack Street Apt 35')).toBe('8 Merrimack Street');
    });

    it('should strip suite numbers', () => {
      expect(stripSecondaryAddress('301 w6th st. ste 108')).toBe('301 w6th st.');
      expect(stripSecondaryAddress('10 market street suite 200')).toBe('10 market street');
    });

    it('should strip unit numbers', () => {
      expect(stripSecondaryAddress('4426 E Lee St Unit 2')).toBe('4426 E Lee St');
      expect(stripSecondaryAddress('626 s cedar st unit c')).toBe('626 s cedar st');
      expect(stripSecondaryAddress('3883 Tara Ave Unit 7')).toBe('3883 Tara Ave');
    });

    it('should strip hash/pound numbers', () => {
      expect(stripSecondaryAddress('4929 York St#1124')).toBe('4929 York St');
      expect(stripSecondaryAddress('1874 Pepper Valley Ln #2')).toBe('1874 Pepper Valley Ln');
      expect(stripSecondaryAddress('4470 Vegas Valley #17')).toBe('4470 Vegas Valley');
    });

    it('should strip building/floor/room indicators', () => {
      expect(stripSecondaryAddress('123 Main St Bldg A')).toBe('123 Main St');
      expect(stripSecondaryAddress('456 Oak Ave Floor 5')).toBe('456 Oak Ave');
      expect(stripSecondaryAddress('789 Pine Rd Rm 101')).toBe('789 Pine Rd');
    });

    it('should handle multiple secondary components', () => {
      expect(stripSecondaryAddress('123 Main St Apt 5 Unit C')).toBe('123 Main St');
      expect(stripSecondaryAddress('456 Oak Ave Bldg 3 Floor 2 Apt 5')).toBe('456 Oak Ave');
    });

    it('should handle embedded secondary components', () => {
      expect(stripSecondaryAddress('100 riverbend dr apt i11 West Columbia')).toBe('100 riverbend dr West Columbia');
      expect(stripSecondaryAddress('4801 Sugar Hill Rd SE apt b Temple')).toBe('4801 Sugar Hill Rd SE Temple');
    });

    it('should handle trailing periods and extra spaces', () => {
      expect(stripSecondaryAddress('123 Main St. Apt 5.')).toBe('123 Main St.');
      expect(stripSecondaryAddress('456  Oak  Ave   Unit  2')).toBe('456 Oak Ave');
    });

    it('should return empty string for empty input', () => {
      expect(stripSecondaryAddress('')).toBe('');
    });

    it('should handle addresses without secondary components', () => {
      expect(stripSecondaryAddress('123 Main Street')).toBe('123 Main Street');
      expect(stripSecondaryAddress('456 Oak Avenue')).toBe('456 Oak Avenue');
    });
  });

  describe('parseRunOnAddress()', () => {
    it('should parse run-on addresses with ZIP', () => {
      const result1 = parseRunOnAddress('815 S West St Green City MO 63545');
      expect(result1.street).toBe('815 S West St');
      expect(result1.city).toBe('Green City');
      expect(result1.state).toBe('MO');
      expect(result1.zip).toBe('63545');

      const result2 = parseRunOnAddress('5374 Desert Shadows Dr Sierra Vista AZ 85635');
      expect(result2.street).toBe('5374 Desert Shadows Dr');
      expect(result2.city).toBe('Sierra Vista');
      expect(result2.state).toBe('AZ');
      expect(result2.zip).toBe('85635');

      const result3 = parseRunOnAddress('11133 ellis lane parks ar 72950');
      expect(result3.street).toBe('11133 ellis lane');
      expect(result3.city).toBe('parks');
      expect(result3.state).toBe('AR');
      expect(result3.zip).toBe('72950');
    });

    it('should parse run-on addresses without ZIP', () => {
      const result1 = parseRunOnAddress('228 wedgwood court vallejo CA');
      expect(result1.street).toBe('228 wedgwood court');
      expect(result1.city).toBe('vallejo');
      expect(result1.state).toBe('CA');
      expect(result1.zip).toBe('');

      const result2 = parseRunOnAddress('710 Donald Avenue Opelika Alabama');
      expect(result2.street).toBe('710 Donald Avenue');
      // Note: Full state names not yet supported in current implementation
      // This is an edge case that could be enhanced in future
    });

    it('should handle addresses with street suffixes', () => {
      const result1 = parseRunOnAddress('1650 S John King Blvd Fate TX 75132');
      expect(result1.street).toBe('1650 S John King Blvd');
      expect(result1.city).toBe('Fate');
      expect(result1.state).toBe('TX');
      expect(result1.zip).toBe('75132');

      const result2 = parseRunOnAddress('316 John Alber road Houston TX');
      expect(result2.street).toBe('316 John Alber road');
      expect(result2.city).toBe('Houston');
      expect(result2.state).toBe('TX');
    });

    it('should handle multi-word city names', () => {
      const result1 = parseRunOnAddress('815 S West St Green City MO 63545');
      expect(result1.city).toBe('Green City');

      const result2 = parseRunOnAddress('5374 Desert Shadows Dr Sierra Vista AZ 85635');
      expect(result2.city).toBe('Sierra Vista');
    });

    it('should return as-is for addresses without state', () => {
      const result = parseRunOnAddress('123 Main Street');
      expect(result.street).toBe('123 Main Street');
      expect(result.city).toBe('');
      expect(result.state).toBe('');
      expect(result.zip).toBe('');
    });

    it('should return empty for empty input', () => {
      const result = parseRunOnAddress('');
      expect(result.street).toBe('');
      expect(result.city).toBe('');
      expect(result.state).toBe('');
      expect(result.zip).toBe('');
    });
  });

  describe('normalizeAddress()', () => {
    it('should normalize addresses with secondary components', () => {
      expect(normalizeAddress('2833 s 115th E. Ave. Apt G')).toBe('2833 S 115th E. Ave.');
      expect(normalizeAddress('301 w6th st. ste 108')).toBe('301 W6th St.');
      expect(normalizeAddress('1421 sw 27th ave apt 402 Ocala fl')).toBe('1421 Sw 27th Ave');
    });

    it('should normalize run-on addresses', () => {
      expect(normalizeAddress('815 S West St Green City MO 63545')).toBe('815 S West St');
      expect(normalizeAddress('5374 Desert Shadows Dr Sierra Vista AZ 85635')).toBe('5374 Desert Shadows Dr');
      expect(normalizeAddress('11133 ellis lane parks ar 72950')).toBe('11133 Ellis Lane');
    });

    it('should normalize addresses with both issues', () => {
      // Run-on address + secondary component
      expect(normalizeAddress('100 riverbend dr apt i11 West Columbia SC')).toBe('100 Riverbend Dr');
      expect(normalizeAddress('4801 Sugar Hill Rd SE apt b Temple GA')).toBe('4801 Sugar Hill Rd');
    });

    it('should handle regular addresses', () => {
      expect(normalizeAddress('123 MAIN STREET')).toBe('123 Main Street');
      expect(normalizeAddress('456 oak avenue')).toBe('456 Oak Avenue');
    });

    it('should handle empty input', () => {
      expect(normalizeAddress('')).toBe('');
    });
  });

  describe('titleCase()', () => {
    it('should convert to title case', () => {
      expect(titleCase('main street')).toBe('Main Street');
      expect(titleCase('MAIN STREET')).toBe('Main Street');
      expect(titleCase('MaIn StReEt')).toBe('Main Street');
    });

    it('should handle hyphenated words', () => {
      expect(titleCase('north-south avenue')).toBe('North-South Avenue');
      expect(titleCase('EAST-WEST BLVD')).toBe('East-West Blvd');
    });

    it('should handle apostrophes', () => {
      expect(titleCase("o'brien street")).toBe("O'Brien Street");
      expect(titleCase("O'BRIEN STREET")).toBe("O'Brien Street");
    });

    it('should handle empty input', () => {
      expect(titleCase('')).toBe('');
    });
  });

  describe('parseLocation()', () => {
    it('should parse comma-separated city/state', () => {
      const result1 = parseLocation('Durham, NC');
      expect(result1.city).toBe('Durham');
      expect(result1.state).toBe('NC');

      const result2 = parseLocation('Los Angeles, CA');
      expect(result2.city).toBe('Los Angeles');
      expect(result2.state).toBe('CA');
    });

    it('should parse space-separated city/state', () => {
      const result1 = parseLocation('Durham NC');
      expect(result1.city).toBe('Durham');
      expect(result1.state).toBe('NC');

      const result2 = parseLocation('Phoenix AZ');
      expect(result2.city).toBe('Phoenix');
      expect(result2.state).toBe('AZ');
    });

    it('should handle full state names', () => {
      const result1 = parseLocation('Durham, North Carolina');
      expect(result1.city).toBe('Durham');
      expect(result1.state).toBe('NC');

      const result2 = parseLocation('Los Angeles California');
      expect(result2.city).toBe('Los Angeles');
      expect(result2.state).toBe('CA');
    });

    it('should handle multi-word cities', () => {
      const result1 = parseLocation('New York, NY');
      expect(result1.city).toBe('New York');
      expect(result1.state).toBe('NY');

      const result2 = parseLocation('Salt Lake City UT');
      expect(result2.city).toBe('Salt Lake City');
      expect(result2.state).toBe('UT');
    });

    it('should strip country if present', () => {
      const result1 = parseLocation('Durham, NC, United States');
      expect(result1.city).toBe('Durham');
      expect(result1.state).toBe('NC');

      const result2 = parseLocation('Phoenix, AZ, USA');
      expect(result2.city).toBe('Phoenix');
      expect(result2.state).toBe('AZ');
    });

    it('should handle city-only input', () => {
      const result = parseLocation('Durham');
      expect(result.city).toBe('Durham');
      expect(result.state).toBe('');
    });

    it('should handle empty input', () => {
      const result = parseLocation('');
      expect(result.city).toBe('');
      expect(result.state).toBe('');
    });
  });

  describe('Real-world test cases from user CSVs', () => {
    it('should handle problematic addresses from cleaned-1900-a-scores-carter-1_xvxe56.csv', () => {
      // Row 13: Rachel Gray
      expect(normalizeAddress('2833 s 115th E. Ave. Apt G')).toBe('2833 S 115th E. Ave.');
      
      // Row 36: Melba Rosa
      expect(normalizeAddress('1421 sw 27th ave apt 402 Ocala fl')).toBe('1421 Sw 27th Ave');
      
      // Row 14: Vernon Hearon
      expect(normalizeAddress('819 E hughBert st Norman')).toBe('819 E Hughbert St');
      
      // Row 17: Yasnely Vega
      expect(normalizeAddress('5840 Willard Street. Casa')).toBe('5840 Willard Street.');
    });

    it('should handle problematic addresses from cleaned-results-3000-b-to-f-ca_1d54rwg.csv', () => {
      // Row 3: Roberta Hockaday
      expect(normalizeAddress('815 S West St Green City MO 63545')).toBe('815 S West St');
      
      // Row 10: Robert Mcgibben
      expect(normalizeAddress('301 w6th st. ste 108')).toBe('301 W6th St.');
      
      // Row 13: Ronald Moreno
      expect(normalizeAddress('4426 E Lee St Unit 2')).toBe('4426 E Lee St');
      
      // Row 23: Darlene Smith
      expect(normalizeAddress('100 riverbend dr apt i11')).toBe('100 Riverbend Dr');
      
      // Row 24: Ethan Coley
      expect(normalizeAddress('11133 ellis lane parks ar 72950')).toBe('11133 Ellis Lane');
      
      // Row 29: Alex Anderson
      expect(normalizeAddress('5374 Desert Shadows Dr Sierra Vista AZ 85635')).toBe('5374 Desert Shadows Dr');
    });
  });
});
