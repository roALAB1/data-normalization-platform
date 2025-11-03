/**
 * v3.13.4 Critical Fixes Tests
 * 
 * Issues:
 * 1. Full Name column appearing in output despite deletion
 * 2. First/Last names showing middle initials (e.g., "Michael m March", "Jennifer R Berman")
 * 3. Column Transformations Applied section missing from post-normalization view (UI only)
 * 4. Location splitting needs verification (Personal City + Personal State)
 * 
 * Root Cause Analysis:
 * - Input CSV has Name, First Name, Last Name columns
 * - Context-aware processor should:
 *   1. Process "Name" column first (primary)
 *   2. Delete "Name" from output
 *   3. Output "First Name" and "Last Name" from Name normalization
 *   4. Ignore existing First Name/Last Name columns (derived)
 * - But currently: All three columns are appearing in output
 */

import { describe, it, expect } from 'vitest';
import { analyzeSchema } from '../client/src/lib/schemaAnalyzer';
import { buildPlan } from '../client/src/lib/normalizationPlan';
import { processRowWithContext } from '../client/src/lib/contextAwareExecutor';

describe('v3.13.4: Full Name Column Removal', () => {
  it('should NOT output Name column when processing name data', () => {
    const headers = ['Name', 'Company'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const row = {
      'Name': 'Dr. John Smith, PhD',
      'Company': 'Acme Corp'
    };
    
    const result = processRowWithContext(row, schema, plan);
    
    // Name column should NOT exist in output
    expect(result['Name']).toBeUndefined();
    
    // Should output First Name and Last Name instead
    expect(result['First Name']).toBe('John');
    expect(result['Last Name']).toBe('Smith');
    expect(result['Company']).toBe('Acme Corp');
  });

  it('should NOT output Name column even when First Name and Last Name columns exist', () => {
    const headers = ['Name', 'First Name', 'Last Name', 'Company'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const row = {
      'Name': 'Dr. John Smith, PhD',
      'First Name': 'JOHN',
      'Last Name': 'SMITH',
      'Company': 'Acme Corp'
    };
    
    const result = processRowWithContext(row, schema, plan);
    
    // Name column should NOT exist in output
    expect(result['Name']).toBeUndefined();
    
    // Should output normalized First Name and Last Name from Name column
    expect(result['First Name']).toBe('John');
    expect(result['Last Name']).toBe('Smith');
    expect(result['Company']).toBe('Acme Corp');
  });

  it('should handle deletion of Name column in column mappings', () => {
    // Simulate user deleting Name column by not including it in schema
    const headers = ['First Name', 'Last Name', 'Company'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const row = {
      'First Name': 'John',
      'Last Name': 'Smith',
      'Company': 'Acme Corp'
    };
    
    const result = processRowWithContext(row, schema, plan);
    
    // Should output normalized First Name and Last Name
    expect(result['First Name']).toBe('John');
    expect(result['Last Name']).toBe('Smith');
    expect(result['Company']).toBe('Acme Corp');
    
    // Name column should not exist
    expect(result['Name']).toBeUndefined();
  });
});

describe('v3.13.4: Middle Initial Removal', () => {
  it('should remove middle initials from First Name', () => {
    const headers = ['Name'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const testCases = [
      { input: 'Michael m March', expectedFirst: 'Michael', expectedLast: 'March' },
      { input: 'Jennifer R Berman', expectedFirst: 'Jennifer', expectedLast: 'Berman' },
      { input: 'John William Templeton', expectedFirst: 'John', expectedLast: 'Templeton' },
      { input: 'James A. Simon', expectedFirst: 'James', expectedLast: 'Simon' },
    ];
    
    testCases.forEach(({ input, expectedFirst, expectedLast }) => {
      const row = { 'Name': input };
      const result = processRowWithContext(row, schema, plan);
      
      expect(result['First Name']).toBe(expectedFirst);
      expect(result['Last Name']).toBe(expectedLast);
    });
  });

  it('should remove credentials from Full Name before splitting', () => {
    const headers = ['Name'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const testCases = [
      { input: 'Jennifer R. Berman, MD', expectedFirst: 'Jennifer', expectedLast: 'Berman' },
      { input: 'John Bell, CFP®', expectedFirst: 'John', expectedLast: 'Bell' },
      { input: 'Alison Theiss, MSc CSC ABS', expectedFirst: 'Alison', expectedLast: 'Theiss' },
      { input: 'Alison S. Perrin, CFP®, APMA™', expectedFirst: 'Alison', expectedLast: 'Perrin' },
    ];
    
    testCases.forEach(({ input, expectedFirst, expectedLast }) => {
      const row = { 'Name': input };
      const result = processRowWithContext(row, schema, plan);
      
      expect(result['First Name']).toBe(expectedFirst);
      expect(result['Last Name']).toBe(expectedLast);
    });
  });

  it('should handle names with pronouns', () => {
    const headers = ['Name'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const row = { 'Name': 'Emily Bouch (she/her)' };
    const result = processRowWithContext(row, schema, plan);
    
    expect(result['First Name']).toBe('Emily');
    expect(result['Last Name']).toBe('Bouch');
  });

  it('should handle single letter last names', () => {
    const headers = ['Name'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const testCases = [
      { input: 'Esther B.', expectedFirst: 'Esther', expectedLast: 'B' },
      { input: 'Dr. Latisha W.', expectedFirst: 'Latisha', expectedLast: 'W' },
    ];
    
    testCases.forEach(({ input, expectedFirst, expectedLast }) => {
      const row = { 'Name': input };
      const result = processRowWithContext(row, schema, plan);
      
      expect(result['First Name']).toBe(expectedFirst);
      expect(result['Last Name']).toBe(expectedLast);
    });
  });
});

describe('v3.13.4: Location Splitting', () => {
  it('should split location into Personal City and Personal State', () => {
    const headers = ['Location'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const testCases = [
      { 
        input: 'Durham, North Carolina, United States', 
        expectedCity: 'Durham', 
        expectedState: 'NC' 
      },
      { 
        input: 'Beverly Hills, California, United States', 
        expectedCity: 'Beverly Hills', 
        expectedState: 'CA' 
      },
      { 
        input: 'San Francisco Bay Area', 
        expectedCity: 'San Francisco', 
        expectedState: 'CA' 
      },
    ];
    
    testCases.forEach(({ input, expectedCity, expectedState }) => {
      const row = { 'Location': input };
      const result = processRowWithContext(row, schema, plan);
      
      // Location column should NOT exist in output
      expect(result['Location']).toBeUndefined();
      
      // Should output Personal City and Personal State
      expect(result['Personal City']).toBe(expectedCity);
      expect(result['Personal State']).toBe(expectedState);
    });
  });

  it('should handle location without country', () => {
    const headers = ['Location'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const row = { 'Location': 'Washington DC-Baltimore Area' };
    const result = processRowWithContext(row, schema, plan);
    
    // Should still split into city and state
    expect(result['Personal City']).toBeDefined();
    expect(result['Personal State']).toBeDefined();
  });
});

describe('v3.13.4: Output Schema Validation', () => {
  it('should output ONLY First Name, Last Name, and other columns (no Name column)', () => {
    const headers = ['Name', 'First Name', 'Last Name', 'Company', 'Title', 'Location'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const row = {
      'Name': 'Michael m March',
      'First Name': 'Michael',
      'Last Name': 'March',
      'Company': 'MAS3 Scientific',
      'Title': 'Owner',
      'Location': 'Durham, North Carolina, United States'
    };
    
    const result = processRowWithContext(row, schema, plan);
    
    // Verify output schema
    expect(result['Name']).toBeUndefined(); // Name should NOT exist
    expect(result['First Name']).toBe('Michael'); // Clean first name
    expect(result['Last Name']).toBe('March'); // Clean last name
    expect(result['Company']).toBe('MAS3 Scientific');
    expect(result['Title']).toBe('Owner');
    expect(result['Location']).toBeUndefined(); // Location should be split
    expect(result['Personal City']).toBe('Durham');
    expect(result['Personal State']).toBe('NC');
  });

  it('should match v3.10.0 output format exactly', () => {
    const headers = ['Name', 'Company'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    const row = {
      'Name': 'Dr. John Smith, PhD',
      'Company': 'Acme Corp'
    };
    
    const result = processRowWithContext(row, schema, plan);
    
    // v3.10.0 format: First Name, Last Name, Company (no Name column)
    const expectedKeys = ['First Name', 'Last Name', 'Company'];
    const actualKeys = Object.keys(result).sort();
    
    expect(actualKeys).toEqual(expectedKeys.sort());
    expect(result['First Name']).toBe('John');
    expect(result['Last Name']).toBe('Smith');
    expect(result['Company']).toBe('Acme Corp');
  });
});
