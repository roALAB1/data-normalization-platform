/**
 * Unit tests for v3.50.0 - Smart Column Mapping (Option 3)
 * 
 * Tests the ColumnCombinationDetector utility for detecting and combining
 * fragmented address, name, and phone columns.
 */

import { describe, it, expect } from 'vitest';
import { ColumnCombinationDetector } from '../shared/utils/ColumnCombinationDetector';

describe('v3.50.0 - Smart Column Mapping', () => {
  describe('Address Component Detection', () => {
    it('should detect house + street combination', () => {
      const headers = ['House', 'StreetNameComplete', 'City', 'State', 'Zip_Code'];
      const sampleData = [
        ['65', 'MILL ST', 'CARBONDALE', 'PA', '1840'],
        ['635', 'HARRISON AVE', 'SCRANTON', 'PA', '1853'],
        ['143', 'BUTTONWOOD ST', 'JESSUP', 'PA', '1843'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('address');
      expect(result.suggestions[0].targetColumnName).toBe('Address');
      expect(result.suggestions[0].columns).toHaveLength(2);
      expect(result.suggestions[0].columns[0].name).toBe('House');
      expect(result.suggestions[0].columns[1].name).toBe('StreetNameComplete');
    });

    it('should detect house + street + apt combination', () => {
      const headers = ['House', 'StreetNameComplete', 'Apt', 'City', 'State'];
      const sampleData = [
        ['400', 'BEDFORD ST', '306', 'CLARKS SUMMIT', 'PA'],
        ['101', 'PENN AVE', '503', 'SCRANTON', 'PA'],
        ['65', 'MILL ST', '', 'CARBONDALE', 'PA'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('address');
      expect(result.suggestions[0].columns).toHaveLength(3);
      expect(result.suggestions[0].columns[2].name).toBe('Apt');
    });

    it('should detect house + suffix + street combination', () => {
      const headers = ['House', 'HouseNoSuffix', 'StreetNameComplete', 'City'];
      const sampleData = [
        ['123', 'A', 'MAIN ST', 'DALLAS'],
        ['456', '1/2', 'OAK AVE', 'HOUSTON'],
        ['789', '', 'ELM RD', 'AUSTIN'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].columns).toHaveLength(3);
      expect(result.suggestions[0].columns[1].name).toBe('HouseNoSuffix');
    });

    it('should generate correct address preview samples', () => {
      const headers = ['House', 'StreetNameComplete', 'Apt'];
      const sampleData = [
        ['65', 'MILL ST', ''],
        ['400', 'BEDFORD ST', '306'],
        ['101', 'PENN AVE', '503'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions[0].previewSamples).toContain('65 MILL ST');
      expect(result.suggestions[0].previewSamples).toContain('400 BEDFORD ST Apt 306');
      expect(result.suggestions[0].previewSamples).toContain('101 PENN AVE Apt 503');
    });

    it('should calculate high confidence for complete address data', () => {
      const headers = ['House', 'StreetNameComplete', 'Apt', 'City'];
      const sampleData = [
        ['65', 'MILL ST', '', 'CARBONDALE'],
        ['400', 'BEDFORD ST', '306', 'CLARKS SUMMIT'],
        ['101', 'PENN AVE', '503', 'SCRANTON'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions[0].confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Name Component Detection', () => {
    it('should detect first + last name combination', () => {
      const headers = ['First Name', 'Last Name', 'Email', 'Phone'];
      const sampleData = [
        ['John', 'Doe', 'john@example.com', '555-1234'],
        ['Jane', 'Smith', 'jane@example.com', '555-5678'],
        ['Bob', 'Johnson', 'bob@example.com', '555-9012'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('name');
      expect(result.suggestions[0].targetColumnName).toBe('Full Name');
      expect(result.suggestions[0].columns).toHaveLength(2);
    });

    it('should detect prefix + first + middle + last + suffix combination', () => {
      const headers = ['Prefix', 'First Name', 'Middle Name', 'Last Name', 'Suffix'];
      const sampleData = [
        ['Dr.', 'John', 'Michael', 'Smith', 'PhD'],
        ['Mr.', 'Robert', 'James', 'Johnson', 'Jr.'],
        ['', 'Jane', '', 'Doe', ''],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].columns).toHaveLength(5);
    });

    it('should generate correct name preview samples', () => {
      const headers = ['First Name', 'Last Name'];
      const sampleData = [
        ['John', 'Doe'],
        ['Jane', 'Smith'],
        ['Bob', 'Johnson'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions[0].previewSamples).toContain('John Doe');
      expect(result.suggestions[0].previewSamples).toContain('Jane Smith');
      expect(result.suggestions[0].previewSamples).toContain('Bob Johnson');
    });
  });

  describe('Phone Component Detection', () => {
    it('should detect area code + number combination', () => {
      const headers = ['Area Code', 'Phone Number', 'Email'];
      const sampleData = [
        ['555', '123-4567', 'john@example.com'],
        ['555', '987-6543', 'jane@example.com'],
        ['555', '456-7890', 'bob@example.com'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('phone');
      expect(result.suggestions[0].targetColumnName).toBe('Phone');
      expect(result.suggestions[0].columns).toHaveLength(2);
    });

    it('should detect area code + number + extension combination', () => {
      const headers = ['Area Code', 'Phone Number', 'Extension'];
      const sampleData = [
        ['555', '123-4567', '100'],
        ['555', '987-6543', '200'],
        ['555', '456-7890', ''],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].columns).toHaveLength(3);
      expect(result.suggestions[0].columns[2].name).toBe('Extension');
    });

    it('should generate correct phone preview samples', () => {
      const headers = ['Area Code', 'Phone Number'];
      const sampleData = [
        ['555', '123-4567'],
        ['555', '987-6543'],
        ['555', '456-7890'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions[0].previewSamples[0]).toContain('(555)');
      expect(result.suggestions[0].previewSamples[0]).toContain('123-4567');
    });
  });

  describe('Column Combination Application', () => {
    it('should combine address columns correctly', () => {
      const headers = ['House', 'StreetNameComplete', 'Apt'];
      const sampleData = [
        ['400', 'BEDFORD ST', '306'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);
      const suggestion = result.suggestions[0];

      const row = ['400', 'BEDFORD ST', '306'];
      const combined = ColumnCombinationDetector.applyCombination(row, suggestion);

      expect(combined).toBe('400 BEDFORD ST Apt 306');
    });

    it('should combine address columns without apt', () => {
      const headers = ['House', 'StreetNameComplete', 'Apt'];
      const sampleData = [
        ['65', 'MILL ST', ''],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);
      const suggestion = result.suggestions[0];

      const row = ['65', 'MILL ST', ''];
      const combined = ColumnCombinationDetector.applyCombination(row, suggestion);

      expect(combined).toBe('65 MILL ST');
    });

    it('should combine name columns correctly', () => {
      const headers = ['First Name', 'Last Name'];
      const sampleData = [
        ['John', 'Doe'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);
      const suggestion = result.suggestions[0];

      const row = ['John', 'Doe'];
      const combined = ColumnCombinationDetector.applyCombination(row, suggestion);

      expect(combined).toBe('John Doe');
    });

    it('should combine phone columns correctly', () => {
      const headers = ['Area Code', 'Phone Number'];
      const sampleData = [
        ['555', '123-4567'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);
      const suggestion = result.suggestions[0];

      const row = ['555', '123-4567'];
      const combined = ColumnCombinationDetector.applyCombination(row, suggestion);

      expect(combined).toContain('(555)');
      expect(combined).toContain('123-4567');
    });
  });

  describe('Multiple Suggestions', () => {
    it('should detect both address and name combinations', () => {
      const headers = ['First Name', 'Last Name', 'House', 'Street', 'City'];
      const sampleData = [
        ['John', 'Doe', '123', 'MAIN ST', 'DALLAS'],
        ['Jane', 'Smith', '456', 'OAK AVE', 'HOUSTON'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
      const types = result.suggestions.map(s => s.type);
      expect(types).toContain('address');
      expect(types).toContain('name');
    });

    it('should detect address, name, and phone combinations', () => {
      const headers = [
        'First Name', 'Last Name',
        'House', 'Street',
        'Area Code', 'Phone Number'
      ];
      const sampleData = [
        ['John', 'Doe', '123', 'MAIN ST', '555', '123-4567'],
        ['Jane', 'Smith', '456', 'OAK AVE', '555', '987-6543'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions.length).toBe(3);
      const types = result.suggestions.map(s => s.type);
      expect(types).toContain('address');
      expect(types).toContain('name');
      expect(types).toContain('phone');
    });
  });

  describe('Edge Cases', () => {
    it('should not suggest combination with only house number', () => {
      const headers = ['House', 'City', 'State'];
      const sampleData = [
        ['123', 'DALLAS', 'TX'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(0);
    });

    it('should not suggest combination with only street name', () => {
      const headers = ['Street', 'City', 'State'];
      const sampleData = [
        ['MAIN ST', 'DALLAS', 'TX'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(0);
    });

    it('should not suggest name combination with only first name', () => {
      const headers = ['First Name', 'Email'];
      const sampleData = [
        ['John', 'john@example.com'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(0);
    });

    it('should not suggest phone combination with only area code', () => {
      const headers = ['Area Code', 'Email'];
      const sampleData = [
        ['555', 'john@example.com'],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(0);
    });

    it('should handle empty sample values gracefully', () => {
      const headers = ['House', 'Street', 'Apt'];
      const sampleData = [
        ['', '', ''],
        ['123', 'MAIN ST', ''],
        ['', '', ''],
      ];

      const result = ColumnCombinationDetector.detect(headers, sampleData);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].confidence).toBeLessThanOrEqual(0.8);
    });
  });
});
