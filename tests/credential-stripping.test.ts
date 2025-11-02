import { describe, it, expect } from 'vitest';
import path from 'path';

/**
 * Credential Stripping Test
 * 
 * This test validates that credentials are properly stripped from names.
 * Based on user's CSV file examples that were failing.
 * 
 * Test cases from actual user data:
 * - "Jennifer R Berman MD" → lastName should be "Berman" (not "Berman, MD")
 * - "John Bell CFP" → lastName should be "Bell" (not "Bell, CFP®")
 * - "Alison Theiss MSc CSC ABS" → lastName should be "Theiss" (not "Theiss, MSc CSC ABS")
 * - "Meg Richichi MS LAc" → lastName should be "Richichi" (not "Richichi, MS, LAc")
 * - "Darshana naik PT DPT" → lastName should be "naik" (not "naik PT, DPT")
 * - "Stephanie Molden MD FPMRS" → lastName should be "Molden" (not "Molden, MD, FPMRS")
 */

describe('Credential Stripping', () => {
  it('should strip MD from last name', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Jennifer R Berman MD');
    
    expect(name.lastName).toBe('Berman');
    expect(name.full).not.toContain('MD');
  });

  it('should strip CFP from last name', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('John Bell CFP');
    
    expect(name.lastName).toBe('Bell');
    expect(name.full).not.toContain('CFP');
  });

  it('should strip multiple credentials (MSc CSC ABS)', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Alison Theiss MSc CSC ABS');
    
    expect(name.lastName).toBe('Theiss');
    expect(name.full).not.toContain('MSc');
    expect(name.full).not.toContain('CSC');
    expect(name.full).not.toContain('ABS');
  });

  it('should strip MS and LAc from last name', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Meg Richichi MS LAc');
    
    expect(name.lastName).toBe('Richichi');
    expect(name.full).not.toContain('MS');
    expect(name.full).not.toContain('LAc');
  });

  it('should strip PT and DPT from last name', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Darshana naik PT DPT');
    
    expect(name.lastName).toBe('naik');
    expect(name.full).not.toContain('PT');
    expect(name.full).not.toContain('DPT');
  });

  it('should strip MD and FPMRS from last name', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Stephanie Molden MD FPMRS');
    
    expect(name.lastName).toBe('Molden');
    expect(name.full).not.toContain('MD');
    expect(name.full).not.toContain('FPMRS');
  });

  it('should handle credentials with periods (M.D.)', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('John Smith M.D.');
    
    expect(name.lastName).toBe('Smith');
    expect(name.full).not.toContain('M.D.');
    expect(name.full).not.toContain('MD');
  });

  it('should handle credentials with special characters (CFP®)', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Jane Doe CFP®');
    
    expect(name.lastName).toBe('Doe');
    expect(name.full).not.toContain('CFP');
  });

  it('should preserve name when no credentials present', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Michael March');
    
    expect(name.lastName).toBe('March');
    expect(name.full).toBe('Michael March');
  });

  it('should handle commas in credentials (Berman, MD)', async () => {
    const { NameEnhanced } = await import('../client/src/lib/NameEnhanced');
    const name = new NameEnhanced('Jennifer Berman, MD');
    
    expect(name.lastName).toBe('Berman');
    expect(name.full).not.toContain('MD');
  });
});
