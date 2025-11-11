import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../NameEnhanced';

describe('Row 888 Test', () => {
  it('should handle row 888 correctly', () => {
    const input = '• Christopher Dean Owner/President  CFL Integrated Business Solutions';
    
    console.log('Input:', input);
    
    const name = new NameEnhanced(input);
    
    console.log('NameEnhanced result:');
    console.log('  isValid:', name.isValid);
    console.log('  firstName:', name.firstName);
    console.log('  lastName:', name.lastName);
    console.log('  full:', name.full);
    console.log('  repairs:', JSON.stringify(name.repairs, null, 2));
    
    // The expected behavior
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Christopher');
    expect(name.lastName).toBe('Dean');
  });
  
  it('should handle row 1253 correctly', () => {
    const input = 'Chandra Brooks,  TEDx and Keynote Speaker, Author, Founder';
    
    console.log('\nInput:', input);
    
    const name = new NameEnhanced(input);
    
    console.log('NameEnhanced result:');
    console.log('  isValid:', name.isValid);
    console.log('  firstName:', name.firstName);
    console.log('  lastName:', name.lastName);
    console.log('  full:', name.full);
    console.log('  repairs:', JSON.stringify(name.repairs, null, 2));
    
    expect(name.isValid).toBe(true);
    expect(name.firstName).toBe('Chandra');
    expect(name.lastName).toBe('Brooks');
  });
});
