import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

describe('NameEnhanced - v3.7.5 Missing Credentials', () => {
  it('should strip CPO credential', () => {
    const name = new NameEnhanced('Sara Bereika CPO');
    expect(name.full).toBe('Sara Bereika');
    expect(name.lastName).toBe('Bereika');
  });

  it('should strip CPO® credential with trademark', () => {
    const name = new NameEnhanced('Sara Bereika CPO®');
    expect(name.full).toBe('Sara Bereika');
    expect(name.lastName).toBe('Bereika');
  });

  it('should strip SRS and PSA credentials', () => {
    const name = new NameEnhanced('Jessica Sullivan SRS PSA');
    expect(name.full).toBe('Jessica Sullivan');
  });

  it('should strip CPC credential', () => {
    const name = new NameEnhanced('Wendi Francis CPC');
    expect(name.full).toBe('Wendi Francis');
  });

  it('should strip "Ph D" with space (not just "Ph.D.")', () => {
    const name = new NameEnhanced('Laurie Watson Ph D');
    expect(name.full).toBe('Laurie Watson');
  });

  // Note: Job titles like "Certified Sex Therapist" cannot be reliably stripped
  // as they are not standardized credentials. Only strip known credentials.
});

describe('NameEnhanced - v3.7.5 First/Last Name Issues', () => {
  it('should strip title from firstName', () => {
    const name = new NameEnhanced('Dr. Kourtney');
    expect(name.firstName).toBe('Kourtney');
    expect(name.full).toBe('Kourtney');
  });

  it('should not include middle name in firstName', () => {
    const name = new NameEnhanced('Mark August Johnson');
    expect(name.firstName).toBe('Mark');
    expect(name.lastName).toBe('Johnson');
  });

  it('should not include middle initial in firstName', () => {
    const name = new NameEnhanced('A. Lawrence Smith');
    expect(name.firstName).toBe('A');
    expect(name.lastName).toBe('Smith');
  });

  it('should strip suffix from lastName', () => {
    const name = new NameEnhanced('John Perry II');
    expect(name.lastName).toBe('Perry');
    expect(name.full).toBe('John Perry');
  });

  it('should strip suffix III from lastName', () => {
    const name = new NameEnhanced('Robert Smith III');
    expect(name.lastName).toBe('Smith');
    expect(name.full).toBe('Robert Smith');
  });

  it('should strip trailing hyphen from lastName', () => {
    const name = new NameEnhanced('John Kurts -');
    expect(name.lastName).toBe('Kurts');
  });

  it('should strip -FNP from lastName', () => {
    const name = new NameEnhanced('Sharon Lemoine -FNP');
    expect(name.lastName).toBe('Lemoine');
  });

  it('should not include nickname in firstName', () => {
    const name = new NameEnhanced('Aaron "Smiley" Johnson');
    expect(name.firstName).toBe('Aaron');
    expect(name.full).toBe('Aaron Johnson');
  });

  it('should not include middle name in parentheses in firstName', () => {
    const name = new NameEnhanced('Nicole (Lina) Smith');
    expect(name.firstName).toBe('Nicole');
  });

  it('should strip trailing comma from firstName', () => {
    const name = new NameEnhanced('Neal Johnson,');
    expect(name.firstName).toBe('Neal');
  });
});
