import { describe, it, expect } from 'vitest';
import { EnrichmentConsolidator, type ParsedCSV, type ConsolidationConfig } from '../server/services/EnrichmentConsolidator';

describe('EnrichmentConsolidator', () => {
  describe('Basic Consolidation', () => {
    it('should consolidate two files with no duplicates', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'first_name', 'phone'],
        rows: [
          { email: 'john@example.com', first_name: 'John', phone: '555-1234' }
        ]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'last_name', 'company'],
        rows: [
          { email: 'jane@example.com', last_name: 'Doe', company: 'Acme Inc' }
        ]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      expect(result.masterFile.rows).toHaveLength(2);
      expect(result.stats.uniqueIdentifiers).toBe(2);
      expect(result.stats.duplicatesFound).toBe(0);
      
      // Should have all columns from both files
      expect(result.masterFile.headers).toContain('email');
      expect(result.masterFile.headers).toContain('first_name');
      expect(result.masterFile.headers).toContain('last_name');
      expect(result.masterFile.headers).toContain('phone');
      expect(result.masterFile.headers).toContain('company');
    });

    it('should merge duplicate identifiers', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'first_name'],
        rows: [
          { email: 'john@example.com', first_name: 'John' }
        ]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'last_name'],
        rows: [
          { email: 'john@example.com', last_name: 'Smith' }
        ]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      expect(result.masterFile.rows).toHaveLength(1);
      expect(result.stats.uniqueIdentifiers).toBe(1);
      expect(result.stats.duplicatesFound).toBe(1);

      // Should have data from both files
      const row = result.masterFile.rows[0];
      expect(row.email).toBe('john@example.com');
      expect(row.first_name).toBe('John');
      expect(row.last_name).toBe('Smith');
    });
  });

  describe('Deduplication Strategies', () => {
    it('should use "newest" strategy (last value wins)', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'phone'],
        rows: [{ email: 'john@example.com', phone: '555-1111' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'phone'],
        rows: [{ email: 'john@example.com', phone: '555-2222' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      expect(result.masterFile.rows[0].phone).toBe('555-2222'); // Last file wins
    });

    it('should use "oldest" strategy (first value wins)', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'phone'],
        rows: [{ email: 'john@example.com', phone: '555-1111' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'phone'],
        rows: [{ email: 'john@example.com', phone: '555-2222' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'oldest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      expect(result.masterFile.rows[0].phone).toBe('555-1111'); // First file wins
    });

    it('should use "longest" strategy', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'company'],
        rows: [{ email: 'john@example.com', company: 'Acme' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'company'],
        rows: [{ email: 'john@example.com', company: 'Acme Corporation Ltd' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'longest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      expect(result.masterFile.rows[0].company).toBe('Acme Corporation Ltd');
    });

    it('should use "most_complete" strategy', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'address'],
        rows: [{ email: 'john@example.com', address: '123 Main' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'address'],
        rows: [{ email: 'john@example.com', address: '123 Main St, Suite 100, San Francisco, CA 94105' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'most_complete'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      // More complete address should win
      expect(result.masterFile.rows[0].address).toContain('San Francisco');
    });

    it('should use "merge" strategy (combine unique values)', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'tags'],
        rows: [{ email: 'john@example.com', tags: 'customer' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'tags'],
        rows: [{ email: 'john@example.com', tags: 'premium' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'merge'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      expect(result.masterFile.rows[0].tags).toBe('customer, premium');
    });
  });

  describe('Per-Column Strategies', () => {
    it('should apply different strategies to different columns', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'phone', 'tags'],
        rows: [{ 
          email: 'john@example.com', 
          phone: '555-1111',
          tags: 'customer'
        }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'phone', 'tags'],
        rows: [{ 
          email: 'john@example.com', 
          phone: '555-2222',
          tags: 'premium'
        }]
      };

      const columnStrategies = new Map([
        ['phone', 'newest' as const],  // Use newest phone
        ['tags', 'merge' as const]     // Merge all tags
      ]);

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'oldest', // Default
        columnStrategies
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      const row = result.masterFile.rows[0];
      expect(row.phone).toBe('555-2222');           // Newest
      expect(row.tags).toBe('customer, premium');   // Merged
    });
  });

  describe('Identifier Normalization', () => {
    it('should normalize identifiers when enabled', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'name'],
        rows: [{ email: 'John@Example.COM', name: 'John Smith' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'phone'],
        rows: [{ email: '  john@example.com  ', phone: '555-1234' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest',
        normalizeIdentifier: true
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      // Should treat as same identifier despite different formatting
      expect(result.masterFile.rows).toHaveLength(1);
      expect(result.stats.duplicatesFound).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty values gracefully', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'phone'],
        rows: [{ email: 'john@example.com', phone: '' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'phone'],
        rows: [{ email: 'john@example.com', phone: '555-1234' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      // Should use non-empty value
      expect(result.masterFile.rows[0].phone).toBe('555-1234');
    });

    it('should handle missing columns', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'first_name'],
        rows: [{ email: 'john@example.com', first_name: 'John' }]
      };

      const file2: ParsedCSV = {
        headers: ['email', 'last_name', 'company'],
        rows: [{ email: 'jane@example.com', last_name: 'Doe', company: 'Acme' }]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1, file2]);

      // Should fill missing columns with empty strings
      expect(result.masterFile.rows[0].last_name).toBe('');
      expect(result.masterFile.rows[0].company).toBe('');
      expect(result.masterFile.rows[1].first_name).toBe('');
    });

    it('should skip rows with empty identifiers', async () => {
      const file1: ParsedCSV = {
        headers: ['email', 'name'],
        rows: [
          { email: '', name: 'No Email' },
          { email: 'valid@example.com', name: 'Valid User' }
        ]
      };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const result = await consolidator.consolidate([file1]);

      // Should only include row with valid identifier
      expect(result.masterFile.rows).toHaveLength(1);
      expect(result.masterFile.rows[0].email).toBe('valid@example.com');
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle 10k rows efficiently', async () => {
      // Generate 10k rows across 3 files with 30% duplicates
      const file1Rows = Array.from({ length: 5000 }, (_, i) => ({
        email: `user${i}@example.com`,
        first_name: `First${i}`,
        phone: `555-${String(i).padStart(4, '0')}`
      }));

      const file2Rows = Array.from({ length: 3000 }, (_, i) => ({
        email: `user${i}@example.com`, // Overlap with file1
        last_name: `Last${i}`,
        company: `Company${i}`
      }));

      const file3Rows = Array.from({ length: 2000 }, (_, i) => ({
        email: `user${i + 5000}@example.com`, // New users
        address: `${i} Main St`
      }));

      const file1: ParsedCSV = { headers: ['email', 'first_name', 'phone'], rows: file1Rows };
      const file2: ParsedCSV = { headers: ['email', 'last_name', 'company'], rows: file2Rows };
      const file3: ParsedCSV = { headers: ['email', 'address'], rows: file3Rows };

      const config: ConsolidationConfig = {
        identifierColumn: 'email',
        deduplicationStrategy: 'newest'
      };

      const consolidator = new EnrichmentConsolidator(config);
      const startTime = Date.now();
      const result = await consolidator.consolidate([file1, file2, file3]);
      const duration = Date.now() - startTime;

      // Verify results
      expect(result.stats.totalInputRows).toBe(10000);
      expect(result.stats.uniqueIdentifiers).toBe(7000); // 5000 + 2000 unique
      expect(result.stats.duplicatesFound).toBe(3000);   // 3000 overlaps
      expect(result.masterFile.rows).toHaveLength(7000);

      // Performance check: should complete in < 2 seconds
      expect(duration).toBeLessThan(2000);
      console.log(`Consolidated 10k rows in ${duration}ms`);
    });
  });
});
