import { describe, it, expect } from 'vitest';
import { NameEnhanced } from '../client/src/lib/NameEnhanced';

describe('Credentials with Commas', () => {
  it('should remove credentials after comma', () => {
    const testCases = [
      { input: 'Jennifer R. Berman, MD', expectedFirst: 'Jennifer', expectedLast: 'Berman' },
      { input: 'John Bell, CFP®', expectedFirst: 'John', expectedLast: 'Bell' },
      { input: 'Emily Bouch (she/her)', expectedFirst: 'Emily', expectedLast: 'Bouch' },
    ];
    
    testCases.forEach(({ input, expectedFirst, expectedLast }) => {
      const name = new NameEnhanced(input);
      console.log(`\nInput: "${input}"`);
      console.log(`  First: "${name.firstName}" (expected: "${expectedFirst}")`);
      console.log(`  Last: "${name.lastName}" (expected: "${expectedLast}")`);
      console.log(`  Suffix: "${name.suffix}"`);
      
      expect(name.firstName).toBe(expectedFirst);
      expect(name.lastName).toBe(expectedLast);
    });
  });
});
