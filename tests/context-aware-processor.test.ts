import { describe, it, expect } from 'vitest';
import { analyzeSchema } from '../client/src/lib/schemaAnalyzer';
import { buildPlan } from '../client/src/lib/normalizationPlan';
import { processRowWithContext } from '../client/src/lib/contextAwareExecutor';

/**
 * Context-Aware CSV Processor Tests
 * 
 * Problem: When CSV has "Name", "First Name", and "Last Name" columns,
 * the processor normalizes each independently and overwrites good data.
 * 
 * Solution: Detect column relationships and normalize once, reuse results.
 */

// Mock data simulating user's CSV
const mockCSVRow = {
  'Name': 'Aaron "Smiley" Johnson',
  'First Name': 'Aaron "Smiley"',  // Has nickname - should be cleaned
  'Last Name': 'Johnson',
  'Company': 'Acme Inc',
};

const mockCSVRow2 = {
  'Name': 'Sharon Lemoine ARNP-FNP',
  'First Name': 'Sharon',
  'Last Name': 'Lemoine -FNP',  // Has credential with leading hyphen - should be cleaned
  'Company': 'Hospital',
};

const mockCSVRow3 = {
  'Name': 'Dr. Ivette Espinosa-Fernandez FACOP',
  'First Name': 'Dr. Ivette',  // Has title - should be cleaned
  'Last Name': 'Espinosa-Fernandez',
  'Company': 'Clinic',
};

const mockCSVRow4 = {
  'Name': 'John Smith III',
  'First Name': 'John William',  // Has middle name - should be cleaned
  'Last Name': 'Smith III',  // Has suffix - should be cleaned
  'Company': 'Corp',
};

describe('Context-Aware CSV Processor', () => {
  describe('Schema Analysis', () => {
    it('should detect Name + First Name + Last Name as related columns', () => {
      const headers = ['Name', 'First Name', 'Last Name', 'Company'];
      const schema = analyzeSchema(headers);
      
      expect(schema).toContainEqual({
        name: 'Name',
        type: 'name',
        role: 'full'
      });
      expect(schema).toContainEqual({
        name: 'First Name',
        type: 'first-name',
        role: 'component',
        relatedTo: ['Name']
      });
      expect(schema).toContainEqual({
        name: 'Last Name',
        type: 'last-name',
        role: 'component',
        relatedTo: ['Name']
      });
    });

    it('should detect phone variants (Mobile, Business Phone, Landline)', () => {
      const headers = ['Name', 'Mobile', 'Business Phone', 'Landline'];
      const schema = analyzeSchema(headers);
      
      expect(schema).toContainEqual({
        name: 'Mobile',
        type: 'phone',
        role: 'variant',
        context: 'mobile'
      });
      expect(schema).toContainEqual({
        name: 'Business Phone',
        type: 'phone',
        role: 'variant',
        context: 'business'
      });
      expect(schema).toContainEqual({
        name: 'Landline',
        type: 'phone',
        role: 'variant',
        context: 'landline'
      });
    });

    it('should detect location components (Address, City, State, Zip)', () => {
      const headers = ['Address', 'City', 'State', 'Zip'];
      const schema = analyzeSchema(headers);
      
      // All should be detected as location-related types
      const locationCols = schema.filter(s => ['address', 'city', 'state', 'zip'].includes(s.type));
      expect(locationCols.length).toBeGreaterThanOrEqual(4);
      
      // Verify each specific type is detected
      expect(schema.some(s => s.type === 'address')).toBe(true);
      expect(schema.some(s => s.type === 'city')).toBe(true);
      expect(schema.some(s => s.type === 'state')).toBe(true);
      expect(schema.some(s => s.type === 'zip')).toBe(true);
    });
  });

  describe('Normalization Plan', () => {
    it('should create plan to normalize Name first, then derive First/Last', () => {
      const headers = ['Name', 'First Name', 'Last Name', 'Company'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      expect(plan.primary).toContain('Name');
      expect(plan.derived).toContainEqual({
        column: 'First Name',
        primary: 'Name',
        extract: 'firstName'
      });
      expect(plan.derived).toContainEqual({
        column: 'Last Name',
        primary: 'Name',
        extract: 'lastName'
      });
    });

    it('should mark independent columns for separate normalization', () => {
      const headers = ['Name', 'Email', 'Phone'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      expect(plan.independent).toContain('Email');
      expect(plan.independent).toContain('Phone');
    });
  });

  describe('Context-Aware Execution', () => {
    it('should clean nickname from First Name when Name has nickname', () => {
      const headers = ['Name', 'First Name', 'Last Name', 'Company'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const result = processRowWithContext(mockCSVRow, schema, plan);
      expect(result['First Name']).toBe('Aaron');
      expect(result['Last Name']).toBe('Johnson');
      // v3.10.0: "Name" column removed from output (only First + Last)
    });

    it('should clean -FNP from Last Name when Name has ARNP-FNP', () => {
      const headers = ['Name', 'First Name', 'Last Name', 'Company'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const result = processRowWithContext(mockCSVRow2, schema, plan);
      expect(result['First Name']).toBe('Sharon');
      expect(result['Last Name']).toBe('Lemoine');
      // v3.10.0: "Name" column removed from output (only First + Last)
    });

    it('should clean title from First Name when Name has title', () => {
      const headers = ['Name', 'First Name', 'Last Name', 'Company'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const result = processRowWithContext(mockCSVRow3, schema, plan);
      expect(result['First Name']).toBe('Ivette');
      expect(result['Last Name']).toBe('Espinosa-Fernandez');
      // v3.10.0: "Name" column removed from output (only First + Last)
    });

    it('should clean middle name and suffix from First/Last Name', () => {
      const headers = ['Name', 'First Name', 'Last Name', 'Company'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const result = processRowWithContext(mockCSVRow4, schema, plan);
      expect(result['First Name']).toBe('John');
      expect(result['Last Name']).toBe('Smith');
      // v3.10.0: "Name" column removed from output (only First + Last)
    });

    it('should not re-normalize when First/Last are already clean', () => {
      const cleanRow = {
        'Name': 'John Smith',
        'First Name': 'John',
        'Last Name': 'Smith',
      };
      
      const headers = ['Name', 'First Name', 'Last Name'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const result = processRowWithContext(cleanRow, schema, plan);
      expect(result['First Name']).toBe('John');
      expect(result['Last Name']).toBe('Smith');
    });

    it('should handle missing Name column gracefully', () => {
      const rowWithoutName = {
        'First Name': 'John',
        'Last Name': 'Smith',
      };
      
      const headers = ['First Name', 'Last Name'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const result = processRowWithContext(rowWithoutName, schema, plan);
      expect(result['First Name']).toBe('John');
      expect(result['Last Name']).toBe('Smith');
    });

    it('should handle missing First/Last columns gracefully', () => {
      const rowWithOnlyName = {
        'Name': 'John Smith MD',
      };
      
      const headers = ['Name'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const result = processRowWithContext(rowWithOnlyName, schema, plan);
      // v3.10.0: When only "Name" column exists, it should derive First + Last
      expect(result['First Name']).toBe('John');
      expect(result['Last Name']).toBe('Smith');
      expect(result['Name']).toBeUndefined(); // Name column removed from output
    });
  });

  describe('Integration with Worker', () => {
    it('should process entire CSV with context awareness', () => {
      const mockCSV = [
        mockCSVRow,
        mockCSVRow2,
        mockCSVRow3,
        mockCSVRow4,
      ];
      
      const headers = ['Name', 'First Name', 'Last Name', 'Company'];
      const schema = analyzeSchema(headers);
      const plan = buildPlan(schema);
      
      const results = mockCSV.map(row => processRowWithContext(row, schema, plan));
      
      // All rows should be processed correctly
      expect(results[0]['First Name']).toBe('Aaron');
      expect(results[1]['Last Name']).toBe('Lemoine');
      expect(results[2]['First Name']).toBe('Ivette');
      expect(results[3]['Last Name']).toBe('Smith');
    });
  });
});
