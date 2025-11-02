import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

describe('NameEnhanced - Full Name Credential Stripping', () => {
  it('should strip single credential from full name', () => {
    const name1 = new NameEnhanced('Jeffrey Kopman MMSc');
    expect(name1.full).toBe('Jeffrey Kopman');
    
    const name2 = new NameEnhanced('Loren Isakson MSEAT');
    expect(name2.full).toBe('Loren Isakson');
  });

  it('should strip multiple credentials from full name', () => {
    const name1 = new NameEnhanced('Stephanie Sublett MSCP IBCLC PMH-C');
    expect(name1.full).toBe('Stephanie Sublett');
    
    const name2 = new NameEnhanced('Sara Barthel CNS LDN');
    expect(name2.full).toBe('Sara Barthel');
    
    const name3 = new NameEnhanced('Anita Calderoni Arredondo CNC CHC BCS');
    expect(name3.full).toBe('Anita Calderoni Arredondo');
  });

  it('should strip title from full name', () => {
    const name1 = new NameEnhanced('Dr. Ivette Espinosa-Fernandez');
    expect(name1.full).toBe('Ivette Espinosa-Fernandez');
    
    const name2 = new NameEnhanced('Dr. Latisha W');
    expect(name2.full).toBe('Latisha W');
    
    const name3 = new NameEnhanced('Dr. Lorie Johnson');
    expect(name3.full).toBe('Lorie Johnson');
  });

  it('should strip both title and credentials', () => {
    const name1 = new NameEnhanced('Dr. Ivette Espinosa-Fernandez FACOP');
    expect(name1.full).toBe('Ivette Espinosa-Fernandez');
    
    const name2 = new NameEnhanced('Genester Wilson-King, MD FACOG [She/Her]');
    expect(name2.full).toBe('Genester Wilson-King');
  });

  it('should strip credentials with special characters', () => {
    const name1 = new NameEnhanced('Sarah de la Torre DipABLM');
    expect(name1.full).toBe('Sarah de la Torre');
    
    const name2 = new NameEnhanced('Barbara Clark-Galupi CFRM');
    expect(name2.full).toBe('Barbara Clark-Galupi');
    
    const name3 = new NameEnhanced('Jade Stefano PATP');
    expect(name3.full).toBe('Jade Stefano');
  });

  it('should preserve name without credentials', () => {
    const name1 = new NameEnhanced('Michael March');
    expect(name1.full).toBe('Michael March');
    
    const name2 = new NameEnhanced('Emily Bouch');
    expect(name2.full).toBe('Emily Bouch');
  });

  it('should handle edge cases', () => {
    // Name with comma and credentials
    const name1 = new NameEnhanced('Elizabeth West NASM-CPT CNC');
    expect(name1.full).toBe('Elizabeth West');
    
    // Name with hyphen and credentials
    const name2 = new NameEnhanced('Heather Quaile WHNP-BC AFN-C MSCP IF FAANP');
    expect(name2.full).toBe('Heather Quaile');
    
    // Name with multiple parts and credentials
    const name3 = new NameEnhanced('Andie B Schwartz M Ed RDN LDN CSCS RYT');
    expect(name3.full).toBe('Andie B Schwartz');
  });
});
