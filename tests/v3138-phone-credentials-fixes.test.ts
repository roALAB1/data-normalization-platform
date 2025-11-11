/**
 * v3.13.8: Phone Preview Format + Missing Credentials
 * 
 * BUGS DISCOVERED:
 * 1. Phone preview shows "+1 415-555-1234" but should be "14155551234" (digits only)
 * 2. Phone column blank in output - FALSE ALARM (input CSV has no phone data)
 * 3. Missing credentials: CSM, CBC, PMP, MBA
 * 
 * USER'S CSV EVIDENCE:
 * - Row 96: "Bobbie Shrivastav, MBA, PMP, PMI-ACP, CSM" - Last Name: "Csm" (should be "Shrivastav")
 * - Row 98: "Anneliese Balazs, CBC" - Last Name: "Cbc" (should be "Balazs")
 */

import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';
import { PhoneEnhanced } from '../shared/normalization/phones/PhoneEnhanced';

describe('v3.13.8: Phone Preview Format', () => {
  it('should return digits only for US phone number', () => {
    const phone = new PhoneEnhanced('(415) 555-1234');
    
    expect(phone.result.isValid).toBe(true);
    expect(phone.result.digitsOnly).toBe('14155551234'); // Should be digits only, no formatting
    expect(phone.result.digitsOnly).not.toContain('+');
    expect(phone.result.digitsOnly).not.toContain('-');
    expect(phone.result.digitsOnly).not.toContain('(');
    expect(phone.result.digitsOnly).not.toContain(')');
    expect(phone.result.digitsOnly).not.toContain(' ');
  });

  it('should return digits only for international phone number', () => {
    const phone = new PhoneEnhanced('+44 20 7946 0958');
    
    expect(phone.result.isValid).toBe(true);
    expect(phone.result.digitsOnly).toBe('442079460958');
    expect(phone.result.digitsOnly).not.toContain('+');
    expect(phone.result.digitsOnly).not.toContain(' ');
  });

  it('should return digits only for phone with multiple formats', () => {
    const phone = new PhoneEnhanced('646-555-0199');
    
    expect(phone.result.isValid).toBe(true);
    expect(phone.result.digitsOnly).toBe('16465550199');
    expect(phone.result.digitsOnly).not.toContain('-');
  });
});

describe('v3.13.8: Missing Credentials - CSM', () => {
  it('should strip CSM from "Bobbie Shrivastav, MBA, PMP, PMI-ACP, CSM"', () => {
    const name = new NameEnhanced('Bobbie Shrivastav, MBA, PMP, PMI-ACP, CSM');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Bobbie');
    expect(name.lastName).toBe('Shrivastav');
    expect(name.lastName).not.toBe('Csm'); // Bug: was "Csm"
    expect(name.full).not.toContain('CSM');
    expect(name.full).not.toContain('MBA');
    expect(name.full).not.toContain('PMP');
    expect(name.full).not.toContain('PMI-ACP');
  });

  it('should strip CSM from "John Doe CSM"', () => {
    const name = new NameEnhanced('John Doe CSM');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('John');
    expect(name.lastName).toBe('Doe');
    expect(name.full).not.toContain('CSM');
  });
});

describe('v3.13.8: Missing Credentials - CBC', () => {
  it('should strip CBC from "Anneliese Balazs, CBC"', () => {
    const name = new NameEnhanced('Anneliese Balazs, CBC');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Anneliese');
    expect(name.lastName).toBe('Balazs');
    expect(name.lastName).not.toBe('Cbc'); // Bug: was "Cbc"
    expect(name.full).not.toContain('CBC');
  });

  it('should strip CBC from "Mary Johnson CBC"', () => {
    const name = new NameEnhanced('Mary Johnson CBC');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Mary');
    expect(name.lastName).toBe('Johnson');
    expect(name.full).not.toContain('CBC');
  });
});

describe('v3.13.8: Missing Credentials - PMP', () => {
  it('should strip PMP from "Jane Smith PMP"', () => {
    const name = new NameEnhanced('Jane Smith PMP');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Jane');
    expect(name.lastName).toBe('Smith');
    expect(name.full).not.toContain('PMP');
  });

  it('should strip PMP from "Bob Williams, PMP, MBA"', () => {
    const name = new NameEnhanced('Bob Williams, PMP, MBA');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Bob');
    expect(name.lastName).toBe('Williams');
    expect(name.full).not.toContain('PMP');
    expect(name.full).not.toContain('MBA');
  });
});

describe('v3.13.8: Missing Credentials - MBA', () => {
  it('should strip MBA from "Sarah Johnson MBA"', () => {
    const name = new NameEnhanced('Sarah Johnson MBA');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Sarah');
    expect(name.lastName).toBe('Johnson');
    expect(name.full).not.toContain('MBA');
  });

  it('should strip MBA from "Donna Young, MBA"', () => {
    const name = new NameEnhanced('Donna Young, MBA');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Donna');
    expect(name.lastName).toBe('Young');
    expect(name.full).not.toContain('MBA');
  });
});

describe('v3.13.8: Multiple Credential Combinations', () => {
  it('should handle MBA + PMP + PMI-ACP + CSM combination', () => {
    const name = new NameEnhanced('Bobbie Shrivastav, MBA, PMP, PMI-ACP, CSM');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Bobbie');
    expect(name.lastName).toBe('Shrivastav');
    // Verify ALL credentials are stripped
    expect(name.full).not.toContain('MBA');
    expect(name.full).not.toContain('PMP');
    expect(name.full).not.toContain('PMI-ACP');
    expect(name.full).not.toContain('CSM');
  });

  it('should handle CGC + MBA combination', () => {
    const name = new NameEnhanced('Sasha Seco Alvarez, CGC, MBA');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Sasha');
    expect(name.lastName).toBe('Alvarez'); // "Seco Alvarez" is a compound last name
    expect(name.full).not.toContain('CGC');
    expect(name.full).not.toContain('MBA');
  });

  it('should handle MA + PMP combination', () => {
    const name = new NameEnhanced('Pamela Oberg, MA, PMP');
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Pamela');
    expect(name.lastName).toBe('Oberg');
    expect(name.full).not.toContain('MA');
    expect(name.full).not.toContain('PMP');
  });
});
