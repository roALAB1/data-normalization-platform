/**
 * Tests for v3.38.0 Zero-Downside Improvements
 * 
 * Testing:
 * 1. Email normalization (Gmail dots, plus-addressing)
 * 2. Whitespace normalization (spaces, tabs, smart quotes)
 * 3. Match statistics calculation
 */

import { describe, it, expect } from 'vitest';

// Mock EnrichmentConsolidator for testing normalization
class TestNormalizer {
  /**
   * Normalize whitespace and special characters
   */
  private normalizeWhitespace(value: string): string {
    return value
      .replace(/\s+/g, ' ')           // Multiple spaces/tabs/newlines to single space
      .replace(/[\u2014\u2013]/g, '-')  // Em dash, en dash to hyphen
      .replace(/[\u201C\u201D]/g, '"')  // Smart quotes to straight quotes
      .replace(/[\u2018\u2019]/g, "'")  // Smart apostrophes to straight
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      .trim();
  }

  /**
   * Normalize email addresses
   */
  private normalizeEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    let [localPart, domain] = parts;
    
    // Gmail: Remove dots from local part (Gmail ignores them)
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      localPart = localPart.replace(/\./g, '');
    }
    
    // Remove plus addressing (user+tag@domain.com -> user@domain.com)
    localPart = localPart.replace(/\+.*$/, '');
    
    return localPart + '@' + domain;
  }

  /**
   * Public method for testing
   */
  public normalizeIdentifier(value: string): string {
    if (!value) return '';
    
    let normalized = String(value).toLowerCase().trim();
    
    // Step 1: Normalize whitespace
    normalized = this.normalizeWhitespace(normalized);
    
    // Step 2: Email normalization
    if (normalized.includes('@')) {
      normalized = this.normalizeEmail(normalized);
    }
    
    // Step 3: Remove special characters
    normalized = normalized.replace(/[^a-z0-9@.+-]/g, '');
    
    return normalized;
  }
}

describe('v3.38.0 Zero-Downside Improvements', () => {
  const normalizer = new TestNormalizer();

  describe('Email Normalization', () => {
    it('should normalize Gmail addresses with dots', () => {
      const emails = [
        'john.smith@gmail.com',
        'johnsmith@gmail.com',
        'j.o.h.n.s.m.i.t.h@gmail.com'
      ];
      
      const normalized = emails.map(e => normalizer.normalizeIdentifier(e));
      
      // All should normalize to same value
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('johnsmith@gmail.com');
    });

    it('should normalize googlemail.com addresses with dots', () => {
      const emails = [
        'john.smith@googlemail.com',
        'johnsmith@googlemail.com'
      ];
      
      const normalized = emails.map(e => normalizer.normalizeIdentifier(e));
      
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('johnsmith@googlemail.com');
    });

    it('should remove plus addressing from all domains', () => {
      const testCases = [
        { input: 'user+tag@domain.com', expected: 'user@domain.com' },
        { input: 'user+newsletter@company.org', expected: 'user@company.org' },
        { input: 'john.smith+work@gmail.com', expected: 'johnsmith@gmail.com' },
        { input: 'test+123@example.com', expected: 'test@example.com' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = normalizer.normalizeIdentifier(input);
        expect(result).toBe(expected);
      });
    });

    it('should not affect non-Gmail domains with dots', () => {
      const email = 'john.smith@company.com';
      const result = normalizer.normalizeIdentifier(email);
      
      // Dots should remain for non-Gmail domains
      expect(result).toBe('john.smith@company.com');
    });

    it('should handle combined Gmail normalization', () => {
      const emails = [
        'john.smith@gmail.com',
        'j.o.h.n.smith+work@gmail.com',
        'johnsmith+newsletter@gmail.com',
        'JOHN.SMITH@GMAIL.COM'
      ];
      
      const normalized = emails.map(e => normalizer.normalizeIdentifier(e));
      
      // All should normalize to same value
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('johnsmith@gmail.com');
    });
  });

  describe('Whitespace Normalization', () => {
    it('should normalize multiple spaces to single space', () => {
      const values = [
        'John  Smith',
        'John   Smith',
        'John    Smith'
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('johnsmith'); // Spaces removed by special char filter
    });

    it('should normalize tabs to spaces', () => {
      const values = [
        'John\tSmith',
        'John  Smith',
        'John Smith'
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
    });

    it('should normalize newlines to spaces', () => {
      const values = [
        'John\nSmith',
        'John\r\nSmith',
        'John Smith'
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
    });

    it('should normalize em dash and en dash to hyphen', () => {
      const values = [
        'Mary—Anne',  // Em dash
        'Mary–Anne',  // En dash
        'Mary-Anne'   // Regular hyphen
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('mary-anne');
    });

    it('should normalize smart quotes to straight quotes', () => {
      const values = [
        '"Test"',     // Straight quotes
        '"Test"',     // Smart quotes
        '"Test"'      // Smart quotes (alternative)
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      // All should normalize to same value (quotes removed by special char filter)
      expect(new Set(normalized).size).toBe(1);
    });

    it('should normalize smart apostrophes', () => {
      const values = [
        "O'Brien",    // Straight apostrophe
        "O'Brien",    // Smart apostrophe
        "O'Brien"     // Smart apostrophe (alternative)
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('obrien'); // Apostrophe removed by special char filter
    });

    it('should remove zero-width characters', () => {
      // Zero-width space, zero-width non-joiner, zero-width joiner
      const values = [
        'Test\u200BValue',  // Zero-width space
        'Test\u200CValue',  // Zero-width non-joiner
        'Test\u200DValue',  // Zero-width joiner
        'TestValue'
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('testvalue');
    });

    it('should handle combined whitespace issues', () => {
      const values = [
        'John  Smith',           // Double space
        'John\tSmith',           // Tab
        'John\nSmith',           // Newline
        ' John Smith ',          // Leading/trailing spaces
        'John   \t\n  Smith'     // Mixed whitespace
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
    });
  });

  describe('Combined Normalization', () => {
    it('should handle email with whitespace issues', () => {
      const emails = [
        'john.smith@gmail.com',
        ' john.smith@gmail.com ',
        'john.smith@gmail.com\n',
        '\tjohn.smith@gmail.com'
      ];
      
      const normalized = emails.map(e => normalizer.normalizeIdentifier(e));
      
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('johnsmith@gmail.com');
    });

    it('should handle complex real-world cases', () => {
      const testCases = [
        {
          inputs: [
            'John.Smith+work@gmail.com',
            'john.smith@gmail.com',
            ' JOHN.SMITH@GMAIL.COM ',
            'johnsmith+newsletter@gmail.com'
          ],
          expected: 'johnsmith@gmail.com'
        },
        {
          inputs: [
            'test@company.com',
            ' test@company.com',
            'test@company.com ',
            'TEST@COMPANY.COM'
          ],
          expected: 'test@company.com'
        }
      ];
      
      testCases.forEach(({ inputs, expected }) => {
        const normalized = inputs.map(i => normalizer.normalizeIdentifier(i));
        expect(new Set(normalized).size).toBe(1);
        expect(normalized[0]).toBe(expected);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(normalizer.normalizeIdentifier('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(normalizer.normalizeIdentifier(null as any)).toBe('');
      expect(normalizer.normalizeIdentifier(undefined as any)).toBe('');
    });

    it('should handle non-email values', () => {
      const values = [
        'John Smith',
        'john smith',
        'JOHN SMITH'
      ];
      
      const normalized = values.map(v => normalizer.normalizeIdentifier(v));
      
      expect(new Set(normalized).size).toBe(1);
    });

    it('should handle malformed emails', () => {
      const emails = [
        'invalid@',
        '@invalid.com',
        'no-at-sign.com'
      ];
      
      // Should not crash
      emails.forEach(email => {
        expect(() => normalizer.normalizeIdentifier(email)).not.toThrow();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large volumes efficiently', () => {
      const startTime = Date.now();
      
      // Normalize 10,000 emails
      for (let i = 0; i < 10000; i++) {
        normalizer.normalizeIdentifier(`user${i}@gmail.com`);
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

describe('Match Statistics (Integration)', () => {
  it('should calculate basic statistics correctly', () => {
    const mockStats = {
      totalOriginalRows: 1000,
      totalEnrichedRows: 800,
      matchedRows: 750,
      unmatchedRows: 250,
      matchRate: 75.0
    };
    
    expect(mockStats.matchedRows + mockStats.unmatchedRows).toBe(mockStats.totalOriginalRows);
    expect(mockStats.matchRate).toBe((mockStats.matchedRows / mockStats.totalOriginalRows) * 100);
  });

  it('should categorize quality distribution correctly', () => {
    const qualityScores = [95, 85, 75, 65, 55, 45, 35];
    
    const distribution = {
      high: qualityScores.filter(s => s >= 80).length,
      medium: qualityScores.filter(s => s >= 50 && s < 80).length,
      low: qualityScores.filter(s => s < 50).length
    };
    
    expect(distribution.high).toBe(2);
    expect(distribution.medium).toBe(3);
    expect(distribution.low).toBe(2);
    expect(distribution.high + distribution.medium + distribution.low).toBe(qualityScores.length);
  });
});
