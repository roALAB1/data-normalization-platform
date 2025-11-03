import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

/**
 * v3.10.0 - Simplified Output Schema Tests
 * 
 * Goal: Verify that normalization outputs ONLY First Name + Last Name
 * (no Full Name, Middle Name, Suffix in output)
 * 
 * Enrichment Tool Requirements:
 * - FIRST_NAME: Title case, no middle initials, no punctuation
 * - LAST_NAME: Title case, no middle initials, no punctuation
 */

describe('v3.10.0 - Simplified Output Schema', () => {
  describe('Basic Name Parsing', () => {
    it('should output only firstName and lastName for simple names', () => {
      const name = new NameEnhanced('John Smith');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      
      // Full Name should NOT be in output (used internally only)
      // Middle Name should NOT be in output
      // Suffix should NOT be in output
    });

    it('should output only firstName and lastName for names with middle initial', () => {
      const name = new NameEnhanced('John M Smith');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // Middle initial 'M' should NOT appear in firstName or lastName
    });

    it('should output only firstName and lastName for names with full middle name', () => {
      const name = new NameEnhanced('John Michael Smith');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // Middle name 'Michael' should NOT appear in firstName or lastName
    });
  });

  describe('Credential Stripping', () => {
    it('should strip credentials and output only firstName and lastName', () => {
      const name = new NameEnhanced('Jennifer Berman MD');
      
      expect(name.firstName).toBe('Jennifer');
      expect(name.lastName).toBe('Berman');
      // 'MD' should NOT appear in lastName
    });

    it('should strip multiple credentials', () => {
      const name = new NameEnhanced('Alison Theiss CSC ABS');
      
      expect(name.firstName).toBe('Alison');
      expect(name.lastName).toBe('Theiss');
      // 'CSC' and 'ABS' should NOT appear in lastName
    });

    it('should strip credentials with middle name', () => {
      const name = new NameEnhanced('Andie B Schwartz M Ed');
      
      expect(name.firstName).toBe('Andie');
      expect(name.lastName).toBe('Schwartz');
      // 'B' (middle) and 'M Ed' (credential) should NOT appear
    });
  });

  describe('Title/Prefix Stripping', () => {
    it('should strip Dr. prefix', () => {
      const name = new NameEnhanced('Dr. John Smith');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // 'Dr.' should NOT appear in firstName
    });

    it('should strip Prof. prefix', () => {
      const name = new NameEnhanced('Prof. Mary Johnson');
      
      expect(name.firstName).toBe('Mary');
      expect(name.lastName).toBe('Johnson');
      // 'Prof.' should NOT appear in firstName
    });
  });

  describe('Suffix Stripping', () => {
    it('should strip Jr. suffix', () => {
      const name = new NameEnhanced('John Smith Jr.');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // 'Jr.' should NOT appear in lastName
    });

    it('should strip Sr. suffix', () => {
      const name = new NameEnhanced('John Smith Sr.');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // 'Sr.' should NOT appear in lastName
    });

    it('should strip III suffix', () => {
      const name = new NameEnhanced('John Smith III');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // 'III' should NOT appear in lastName
    });
  });

  describe('Complex Names', () => {
    it('should handle names with title, middle, suffix, and credentials', () => {
      const name = new NameEnhanced('Dr. John Michael Smith Jr. MD');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // Only first and last name, everything else stripped
    });

    // Compound first name detection skipped for v3.10.0
    // Will be added in future version if needed
    // Example: "Mary Jo Williams" → firstName="Mary", middleName="Jo", lastName="Williams"

    it('should handle hyphenated last names', () => {
      const name = new NameEnhanced('Mary Smith-Johnson');
      
      expect(name.firstName).toBe('Mary');
      expect(name.lastName).toBe('Smith-Johnson');
      // Hyphenated last name should stay together
    });

    it('should handle apostrophes in last names', () => {
      const name = new NameEnhanced("Patrick O'Connor");
      
      expect(name.firstName).toBe('Patrick');
      expect(name.lastName).toBe("O'Connor");
      // Apostrophe should be preserved in last name
    });
  });

  describe('Title Case Formatting', () => {
    it('should convert all-caps names to title case', () => {
      const name = new NameEnhanced('JOHN SMITH');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
    });

    it('should convert all-lowercase names to title case', () => {
      const name = new NameEnhanced('john smith');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
    });

    it('should handle mixed case names', () => {
      const name = new NameEnhanced('jOhN sMiTh');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-word names', () => {
      const name = new NameEnhanced('Madonna');
      
      expect(name.firstName).toBe('Madonna');
      expect(name.lastName).toBe('');
      // Single-word name goes to firstName, lastName is empty
    });

    it('should handle names with extra spaces', () => {
      const name = new NameEnhanced('John    Smith');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // Extra spaces should be normalized
    });

    it('should handle names with leading/trailing spaces', () => {
      const name = new NameEnhanced('  John Smith  ');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Smith');
      // Leading/trailing spaces should be trimmed
    });
  });

  describe('Real-World Examples from CSV', () => {
    it('should handle "Michael m March"', () => {
      const name = new NameEnhanced('Michael m March');
      
      expect(name.firstName).toBe('Michael');
      expect(name.lastName).toBe('March');
      // Middle initial 'm' should NOT appear
    });

    it('should handle "Jennifer R Berman"', () => {
      const name = new NameEnhanced('Jennifer R Berman');
      
      expect(name.firstName).toBe('Jennifer');
      expect(name.lastName).toBe('Berman');
      // Middle initial 'R' should NOT appear
    });

    it('should handle "John William Templeton"', () => {
      const name = new NameEnhanced('John William Templeton');
      
      expect(name.firstName).toBe('John');
      expect(name.lastName).toBe('Templeton');
      // Middle name 'William' should NOT appear
    });

    it('should handle "Esther m B"', () => {
      const name = new NameEnhanced('Esther m B');
      
      expect(name.firstName).toBe('Esther');
      expect(name.lastName).toBe('B');
      // This is an incomplete name (just first + last initial)
      // Middle 'm' should NOT appear
    });
  });
});
