import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

/**
 * v3.8.1 - Fix Remaining 5 Issues
 * 
 * Rows with issues:
 * - Row 81: Nancy Kurts - (trailing hyphen)
 * - Row 170: #NAME? error
 * - Row 386: Jeani Hunt CDN (missing credential)
 * - Row 404: Andie B Schwartz M Ed ("M Ed" splitting)
 * - Row 405: Abrar Al-Shaer WIMI-CP (missing credential)
 */

describe('v3.8.1 - Remaining 5 Issues', () => {
  describe('Missing Credentials', () => {
    it('should strip CDN credential (Row 386)', () => {
      const name = new NameEnhanced('Jeani Hunt CDN');
      expect(name.isValid).toBe(true);
      expect(name.full).toBe('Jeani Hunt');
      expect(name.firstName).toBe('Jeani');
      expect(name.lastName).toBe('Hunt');
    });

    it('should strip WIMI-CP credential (Row 405)', () => {
      const name = new NameEnhanced('Abrar Al-Shaer WIMI-CP');
      expect(name.isValid).toBe(true);
      expect(name.full).toBe('Abrar Al-Shaer');
      expect(name.firstName).toBe('Abrar');
      expect(name.lastName).toBe('Al-Shaer');
    });
  });

  describe('M Ed Splitting Bug', () => {
    it('should strip "M Ed" as a single credential (Row 404)', () => {
      const name = new NameEnhanced('Andie B Schwartz M Ed');
      expect(name.isValid).toBe(true);
      // v3.13.4: Middle initials are now filtered out
      expect(name.full).toBe('Andie Schwartz'); // Middle initial 'B' removed
      expect(name.firstName).toBe('Andie');
      expect(name.middleName).toBe(null); // v3.13.4: Single-letter initials filtered
      expect(name.lastName).toBe('Schwartz');
      // "M Ed" should be in suffix, not split
      expect(name.suffix).toContain('M Ed');
    });

    it('should handle "M Ed" with other credentials', () => {
      const name = new NameEnhanced('John Smith M Ed RDN');
      expect(name.isValid).toBe(true);
      expect(name.full).toBe('John Smith');
      expect(name.lastName).toBe('Smith');
      // Both credentials should be stripped
      expect(name.suffix).toContain('M Ed');
      expect(name.suffix).toContain('RDN');
    });
  });

  describe('Trailing Hyphen', () => {
    it('should clean trailing hyphen from last name (Row 81)', () => {
      const name = new NameEnhanced('Nancy Kurts -');
      expect(name.isValid).toBe(true);
      expect(name.full).toBe('Nancy Kurts');
      expect(name.firstName).toBe('Nancy');
      expect(name.lastName).toBe('Kurts');
      // Last name should NOT be "-"
      expect(name.lastName).not.toBe('-');
    });

    it('should handle trailing hyphen with spaces', () => {
      const name = new NameEnhanced('John Smith - ');
      expect(name.isValid).toBe(true);
      expect(name.lastName).toBe('Smith');
    });
  });

  describe('#NAME? Error Handling', () => {
    it('should handle #NAME? gracefully (Row 170)', () => {
      const name = new NameEnhanced('#NAME?');
      // Should be marked as invalid
      expect(name.isValid).toBe(false);
      expect(name.full).toBe('');
    });

    it('should handle Excel error values', () => {
      const invalidNames = ['#NAME?', '#VALUE!', '#REF!', '#DIV/0!', '#N/A'];
      
      invalidNames.forEach(invalid => {
        const name = new NameEnhanced(invalid);
        expect(name.isValid).toBe(false);
        expect(name.full).toBe('');
      });
    });
  });

  describe('Regression Tests', () => {
    it('should still handle hyphenated last names correctly', () => {
      const name = new NameEnhanced('Mary Smith-Jones');
      expect(name.isValid).toBe(true);
      expect(name.lastName).toBe('Smith-Jones');
    });

    it('should still strip credentials with hyphens', () => {
      const name = new NameEnhanced('Sharon Lemoine ARNP-FNP');
      expect(name.isValid).toBe(true);
      expect(name.lastName).toBe('Lemoine');
    });
  });
});
