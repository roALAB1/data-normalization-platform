/**
 * v3.13.7: Critical Bug Fixes - Name Column & Credential Stripping
 * 
 * BUGS DISCOVERED:
 * 1. Name column still appearing in output even after user deleted it via UI
 * 2. Credentials NOT being stripped from Name column (MD, WELL AP, Ed.D., CCC-SLP, etc.)
 * 
 * USER'S CSV EVIDENCE:
 * - Row 5: "Susan Gross, MD" - MD credential present
 * - Row 13: "Nicole Snell, CA, ESDP" - Multiple credentials
 * - Row 19: "Regan Donoghue WELL AP" - WELL AP credential
 * - Row 23: "Nicole M. Mancini, Ed.D., CCC-SLP" - Multiple credentials with periods and commas
 */

import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';
import { processRowWithContext } from '../client/src/lib/contextAwareExecutor';
import { analyzeSchema } from '../client/src/lib/schemaAnalyzer';
import { buildPlan } from '../client/src/lib/normalizationPlan';

describe('v3.13.7: Name Column Deletion Bug', () => {
  it('should NOT output Name column when both Name and First/Last Name columns exist', () => {
    // Simulate CSV with Name, First Name, Last Name columns
    const row = {
      'Name': 'Dr. John Smith, PhD',
      'First Name': 'John',
      'Last Name': 'Smith',
      'Company': 'Acme Corp'
    };
    
    const headers = Object.keys(row);
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    const result = processRowWithContext(row, schema, plan);
    
    // Name column should NOT be in output
    expect(result).not.toHaveProperty('Name');
    
    // First Name and Last Name should be in output
    expect(result).toHaveProperty('First Name');
    expect(result).toHaveProperty('Last Name');
    
    // Company should still be there
    expect(result).toHaveProperty('Company');
  });

  it('should delete Name column even when it has credentials', () => {
    const row = {
      'Name': 'Susan Gross, MD',
      'Company': 'Hospital'
    };
    
    const headers = Object.keys(row);
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    const result = processRowWithContext(row, schema, plan);
    
    // Name column should NOT be in output
    expect(result).not.toHaveProperty('Name');
    
    // Should output clean First/Last names
    expect(result['First Name']).toBe('Susan');
    expect(result['Last Name']).toBe('Gross');
  });
});

describe('v3.13.7: Credential Stripping Bugs', () => {
  it('should strip MD credential from "Susan Gross, MD"', () => {
    const name = new NameEnhanced('Susan Gross, MD');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Susan');
    expect(name.lastName).toBe('Gross');
    expect(name.full).not.toContain('MD');
  });

  it('should strip WELL AP credential from "Regan Donoghue WELL AP"', () => {
    const name = new NameEnhanced('Regan Donoghue WELL AP');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Regan');
    expect(name.lastName).toBe('Donoghue');
    expect(name.full).not.toContain('WELL AP');
  });

  it('should strip multiple credentials from "Nicole M. Mancini, Ed.D., CCC-SLP"', () => {
    const name = new NameEnhanced('Nicole M. Mancini, Ed.D., CCC-SLP');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Nicole');
    expect(name.lastName).toBe('Mancini');
    expect(name.full).not.toContain('Ed.D.');
    expect(name.full).not.toContain('CCC-SLP');
    expect(name.full).not.toContain('M.'); // Middle initial should also be removed
  });

  it('should strip multiple credentials from "Nicole Snell, CA, ESDP"', () => {
    const name = new NameEnhanced('Nicole Snell, CA, ESDP');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Nicole');
    expect(name.lastName).toBe('Snell');
    expect(name.full).not.toContain('CA');
    expect(name.full).not.toContain('ESDP');
  });

  it('should handle credentials without commas', () => {
    const name = new NameEnhanced('John Smith MD PhD');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('John');
    expect(name.lastName).toBe('Smith');
    expect(name.full).not.toContain('MD');
    expect(name.full).not.toContain('PhD');
  });

  it('should handle credentials with periods', () => {
    const name = new NameEnhanced('Jane Doe, M.D., Ph.D.');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Jane');
    expect(name.lastName).toBe('Doe');
    expect(name.full).not.toContain('M.D.');
    expect(name.full).not.toContain('Ph.D.');
  });
});

describe('v3.13.7: Edge Cases', () => {
  it('should handle names with both middle initials and credentials', () => {
    const name = new NameEnhanced('Jennifer R. Berman, MD');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Jennifer');
    expect(name.lastName).toBe('Berman');
    expect(name.full).not.toContain('R.');
    expect(name.full).not.toContain('MD');
  });

  it('should handle hyphenated credentials', () => {
    const name = new NameEnhanced('Mary Johnson CCC-SLP');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Mary');
    expect(name.lastName).toBe('Johnson');
    expect(name.full).not.toContain('CCC-SLP');
  });

  it('should handle credentials with spaces', () => {
    const name = new NameEnhanced('Bob Williams WELL AP');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Bob');
    expect(name.lastName).toBe('Williams');
    expect(name.full).not.toContain('WELL AP');
  });
});
