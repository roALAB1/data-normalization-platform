import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

describe('Debug NameEnhanced', () => {
  it('should parse James A. Simon correctly', () => {
    const name = new NameEnhanced('James A. Simon');
    
    console.log('\n=== James A. Simon ===');
    console.log('firstName:', name.firstName);
    console.log('middleName:', name.middleName);
    console.log('lastName:', name.lastName);
    
    expect(name.firstName).toBe('James');
    expect(name.middleName).toBeNull(); // Should be null after filtering
    expect(name.lastName).toBe('Simon');
  });
});
