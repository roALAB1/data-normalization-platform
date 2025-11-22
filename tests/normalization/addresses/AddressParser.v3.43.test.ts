/**
 * Unit tests for AddressParser v3.43.0
 * Testing city/state extraction from run-on addresses
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeAddress,
  normalizeAddressString,
  parseRunOnAddress,
  stripSecondaryAddress,
  type NormalizedAddress
} from '../../../shared/normalization/addresses/AddressParser';

describe('AddressParser v3.43.0 - City/State Extraction', () => {
  describe('normalizeAddress() - Full object output', () => {
    it('should extract city and state from run-on address', () => {
      const result = normalizeAddress('815 S West St Green City MO 63545');
      expect(result).toMatchObject({
        street: '815 S West St',
        city: 'Green City',
        state: 'MO',
        zip: '63545'
      });
    });

    it('should handle multi-word cities', () => {
      const result = normalizeAddress('123 Main St Sierra Vista AZ 85635');
      expect(result).toMatchObject({
        street: '123 Main St',
        city: 'Sierra Vista',
        state: 'AZ',
        zip: '85635'
      });
    });

    it('should handle three-word cities', () => {
      const result = normalizeAddress('456 Oak Ave Rancho Santa Fe CA 92067');
      expect(result).toMatchObject({
        street: '456 Oak Ave',
        city: 'Rancho Santa Fe',
        state: 'CA',
        zip: '92067'
      });
    });

    it('should strip secondary addresses before city/state extraction', () => {
      const result = normalizeAddress('301 W 6th St Ste 108 Austin TX 78701');
      expect(result).toMatchObject({
        street: '301 W 6th St',
        city: 'Austin',
        state: 'TX',
        zip: '78701'
      });
    });

    it('should handle addresses with apartment numbers', () => {
      const result = normalizeAddress('789 Elm St Apt 402 Durham NC 27701');
      expect(result).toMatchObject({
        street: '789 Elm St',
        city: 'Durham',
        state: 'NC',
        zip: '27701'
      });
    });

    it('should handle addresses with hash numbers', () => {
      const result = normalizeAddress('123 Pine Ave #1124 Portland OR 97201');
      expect(result).toMatchObject({
        street: '123 Pine Ave',
        city: 'Portland',
        state: 'OR',
        zip: '97201'
      });
    });

    it('should handle addresses without ZIP codes', () => {
      const result = normalizeAddress('456 Maple Dr Springfield IL');
      expect(result).toMatchObject({
        street: '456 Maple Dr',
        city: 'Springfield',
        state: 'IL',
        zip: ''
      });
    });

    it('should handle addresses without city/state', () => {
      const result = normalizeAddress('123 Main Street');
      expect(result).toMatchObject({
        street: '123 Main Street',
        city: '',
        state: '',
        zip: ''
      });
    });

    it('should handle empty addresses', () => {
      const result = normalizeAddress('');
      expect(result).toMatchObject({
        street: '',
        city: '',
        state: '',
        zip: ''
      });
    });

    it('should apply title case to street and city', () => {
      const result = normalizeAddress('815 S WEST ST GREEN CITY MO 63545');
      expect(result).toMatchObject({
        street: '815 S West St',
        city: 'Green City',
        state: 'MO',
        zip: '63545'
      });
    });

    it('should normalize state to uppercase', () => {
      const result = normalizeAddress('123 Main St Durham nc 27701');
      expect(result).toMatchObject({
        street: '123 Main St',
        city: 'Durham',
        state: 'NC',
        zip: '27701'
      });
    });
  });

  describe('normalizeAddressString() - Backward compatibility', () => {
    it('should return only street address (legacy behavior)', () => {
      const result = normalizeAddressString('815 S West St Green City MO 63545');
      expect(result).toBe('815 S West St');
    });

    it('should strip secondary addresses', () => {
      const result = normalizeAddressString('301 W 6th St Ste 108 Austin TX 78701');
      expect(result).toBe('301 W 6th St');
    });

    it('should apply title case', () => {
      const result = normalizeAddressString('815 S WEST ST GREEN CITY MO 63545');
      expect(result).toBe('815 S West St');
    });
  });

  describe('parseRunOnAddress() - Raw parsing', () => {
    it('should parse all components correctly', () => {
      const result = parseRunOnAddress('815 S West St Green City MO 63545');
      expect(result).toMatchObject({
        street: '815 S West St',
        city: 'Green City',
        state: 'MO',
        zip: '63545'
      });
    });

    it('should handle lowercase state codes', () => {
      const result = parseRunOnAddress('123 Main St Durham nc 27701');
      expect(result).toMatchObject({
        street: '123 Main St',
        city: 'Durham',
        state: 'NC',
        zip: '27701'
      });
    });

    it('should handle addresses without street suffixes', () => {
      const result = parseRunOnAddress('123 Main Durham NC 27701');
      expect(result).toMatchObject({
        street: '123 Main',
        city: 'Durham',
        state: 'NC',
        zip: '27701'
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle addresses with periods', () => {
      const result = normalizeAddress('301 w. 6th st. ste 108 Austin TX 78701');
      expect(result).toMatchObject({
        street: '301 W 6th St',
        city: 'Austin',
        state: 'TX',
        zip: '78701'
      });
    });

    it('should handle addresses with extra spaces', () => {
      const result = normalizeAddress('815  S  West  St  Green City  MO  63545');
      expect(result).toMatchObject({
        street: '815 S West St',
        city: 'Green City',
        state: 'MO',
        zip: '63545'
      });
    });

    it('should handle addresses with mixed case', () => {
      const result = normalizeAddress('815 s WeSt sT gReEn CiTy Mo 63545');
      expect(result).toMatchObject({
        street: '815 S West St',
        city: 'Green City',
        state: 'MO',
        zip: '63545'
      });
    });

    it('should handle addresses with hyphens in street names', () => {
      const result = normalizeAddress('123 North-South Blvd Durham NC 27701');
      expect(result).toMatchObject({
        street: '123 North-South Blvd',
        city: 'Durham',
        state: 'NC',
        zip: '27701'
      });
    });

    it('should handle addresses with apostrophes in street names', () => {
      const result = normalizeAddress("456 O'Brien Ave Portland OR 97201");
      expect(result).toMatchObject({
        street: "456 O'Brien Ave",
        city: 'Portland',
        state: 'OR',
        zip: '97201'
      });
    });
  });

  describe('Real-world examples from user CSV files', () => {
    it('should handle example 1: Green City MO', () => {
      const result = normalizeAddress('815 S West St Green City MO 63545');
      expect(result.street).toBe('815 S West St');
      expect(result.city).toBe('Green City');
      expect(result.state).toBe('MO');
      expect(result.zip).toBe('63545');
    });

    it('should handle example 2: Suite in middle', () => {
      const result = normalizeAddress('301 w6th st. ste 108');
      expect(result.street).toBe('301 W6th St');
      expect(result.city).toBe('');
      expect(result.state).toBe('');
      expect(result.zip).toBe('');
    });

    it('should handle example 3: Apartment number', () => {
      const result = normalizeAddress('789 Elm St Apt 402 Durham NC 27701');
      expect(result.street).toBe('789 Elm St');
      expect(result.city).toBe('Durham');
      expect(result.state).toBe('NC');
      expect(result.zip).toBe('27701');
    });
  });
});
