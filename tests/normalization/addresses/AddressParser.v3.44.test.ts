import { describe, it, expect } from 'vitest';
import {
  normalizeAddress,
  parseRunOnAddress,
  stripSecondaryAddress,
} from '../../../shared/normalization/addresses/AddressParser';

describe('AddressParser v3.44.0 - ZIP+4 Support', () => {
  describe('ZIP+4 extraction', () => {
    it('should extract ZIP+4 format (12345-6789)', () => {
      const result = normalizeAddress('123 Main St Durham NC 27701-1234');
      expect(result).toMatchObject({
        street: '123 Main St',
        city: 'Durham',
        state: 'NC',
        zip: '27701-1234'
      });
    });

    it('should extract ZIP+4 from run-on address', () => {
      const result = normalizeAddress('456 Oak Ave Portland OR 97201-5678');
      expect(result).toMatchObject({
        street: '456 Oak Ave',
        city: 'Portland',
        state: 'OR',
        zip: '97201-5678'
      });
    });

    it('should handle ZIP+4 with secondary address', () => {
      const result = normalizeAddress('789 Elm St Apt 402 Seattle WA 98101-2345');
      expect(result).toMatchObject({
        street: '789 Elm St',
        city: 'Seattle',
        state: 'WA',
        zip: '98101-2345'
      });
    });

    it('should handle ZIP+4 without street suffix', () => {
      const result = normalizeAddress('321 Broadway Austin TX 78701-9876');
      expect(result).toMatchObject({
        street: '321 Broadway',
        city: 'Austin',
        state: 'TX',
        zip: '78701-9876'
      });
    });

    it('should still handle 5-digit ZIP codes', () => {
      const result = normalizeAddress('555 Pine St Boston MA 02101');
      expect(result).toMatchObject({
        street: '555 Pine St',
        city: 'Boston',
        state: 'MA',
        zip: '02101'
      });
    });

    it('should handle addresses without ZIP', () => {
      const result = normalizeAddress('777 Maple Dr Chicago IL');
      expect(result).toMatchObject({
        street: '777 Maple Dr',
        city: 'Chicago',
        state: 'IL',
        zip: ''
      });
    });

    it('should handle ZIP+4 with hyphenated street names', () => {
      const result = normalizeAddress('123 North-South Blvd Durham NC 27701-1111');
      expect(result).toMatchObject({
        street: '123 North-South Blvd',
        city: 'Durham',
        state: 'NC',
        zip: '27701-1111'
      });
    });

    it('should handle ZIP+4 with periods in street names', () => {
      const result = normalizeAddress('301 w. 6th st. Austin TX 78701-2222');
      expect(result).toMatchObject({
        street: '301 W 6th St',
        city: 'Austin',
        state: 'TX',
        zip: '78701-2222'
      });
    });
  });

  describe('parseRunOnAddress() - ZIP+4 extraction', () => {
    it('should extract ZIP+4 from raw address', () => {
      const result = parseRunOnAddress('123 Main St Durham NC 27701-1234');
      expect(result.zip).toBe('27701-1234');
      expect(result.state).toBe('NC');
      expect(result.city).toBe('Durham');
      expect(result.street).toBe('123 Main St');
    });

    it('should prioritize ZIP+4 over 5-digit ZIP', () => {
      const result = parseRunOnAddress('456 Oak Ave Portland OR 97201-5678');
      expect(result.zip).toBe('97201-5678');
    });
  });

  describe('Backward compatibility', () => {
    it('should not break existing 5-digit ZIP extraction', () => {
      const addresses = [
        '123 Main St Durham NC 27701',
        '456 Oak Ave Portland OR 97201',
        '789 Elm St Seattle WA 98101'
      ];

      addresses.forEach(addr => {
        const result = normalizeAddress(addr);
        expect(result.zip).toMatch(/^\d{5}$/);
      });
    });

    it('should handle mixed ZIP formats in batch', () => {
      const addresses = [
        { input: '123 Main St Durham NC 27701', expectedZip: '27701' },
        { input: '456 Oak Ave Portland OR 97201-5678', expectedZip: '97201-5678' },
        { input: '789 Elm St Seattle WA 98101', expectedZip: '98101' },
        { input: '321 Broadway Austin TX 78701-9876', expectedZip: '78701-9876' }
      ];

      addresses.forEach(({ input, expectedZip }) => {
        const result = normalizeAddress(input);
        expect(result.zip).toBe(expectedZip);
      });
    });
  });
});
