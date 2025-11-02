/**
 * Comprehensive Test Suite for Name Normalization
 * This prevents regressions by validating all known edge cases
 */

import { NameEnhanced } from '../client/src/lib/NameEnhanced';

interface TestCase {
  input: string;
  expected: {
    full: string;
    firstName: string;
    lastName: string;
    prefix?: string | null;
    suffix?: string | null;
  };
  description: string;
}

const TEST_CASES: TestCase[] = [
  // CREDENTIAL STRIPPING TESTS
  {
    input: 'John Bell CFP',
    expected: { full: 'John Bell', firstName: 'John', lastName: 'Bell' },
    description: 'Should strip CFP credential'
  },
  {
    input: 'Emily Bouch (she/her)',
    expected: { full: 'Emily Bouch', firstName: 'Emily', lastName: 'Bouch' },
    description: 'Should strip pronouns in parentheses'
  },
  {
    input: 'Alison Theiss MSc CSC ABS',
    expected: { full: 'Alison Theiss', firstName: 'Alison', lastName: 'Theiss' },
    description: 'Should strip multiple credentials'
  },
  {
    input: 'Meg Richichi MS LAc',
    expected: { full: 'Meg Richichi', firstName: 'Meg', lastName: 'Richichi' },
    description: 'Should strip MS and LAc credentials'
  },
  {
    input: 'Stephanie Molden MD FPMRS',
    expected: { full: 'Stephanie Molden', firstName: 'Stephanie', lastName: 'Molden' },
    description: 'Should strip MD and FPMRS credentials'
  },
  {
    input: 'Jennifer R Berman MD',
    expected: { full: 'Jennifer R Berman', firstName: 'Jennifer', lastName: 'Berman' },
    description: 'Should strip MD credential and preserve middle initial'
  },
  {
    input: 'James A Simon MD',
    expected: { full: 'James A Simon', firstName: 'James', lastName: 'Simon' },
    description: 'Should strip MD and preserve middle initial'
  },
  {
    input: 'Alison S Perrin CFP APMA',
    expected: { full: 'Alison S Perrin', firstName: 'Alison', lastName: 'Perrin' },
    description: 'Should strip CFP APMA and preserve middle initial'
  },

  // PREFIX/SUFFIX HANDLING TESTS
  {
    input: 'Dr. Darshana naik PT DPT',
    expected: { full: 'Dr. Darshana naik', firstName: 'Darshana', lastName: 'naik', prefix: 'Dr.' },
    description: 'Should preserve Dr. prefix and strip PT DPT credentials'
  },
  {
    input: 'Dr. Latisha W',
    expected: { full: 'Dr. Latisha W', firstName: 'Latisha', lastName: 'W', prefix: 'Dr.' },
    description: 'Should preserve Dr. prefix with single letter last name'
  },
  {
    input: 'Dr. Lorie Johnson',
    expected: { full: 'Dr. Lorie Johnson', firstName: 'Lorie', lastName: 'Johnson', prefix: 'Dr.' },
    description: 'Should preserve Dr. prefix'
  },

  // EMPTY PART HANDLING (format code leak prevention)
  {
    input: 'Michael March',
    expected: { full: 'Michael March', firstName: 'Michael', lastName: 'March' },
    description: 'Should NOT add p, m, s letters when parts are empty'
  },
  {
    input: 'John Templeton',
    expected: { full: 'John Templeton', firstName: 'John', lastName: 'Templeton' },
    description: 'Should NOT add format codes for missing middle name'
  },
  {
    input: 'Esther B',
    expected: { full: 'Esther B', firstName: 'Esther', lastName: 'B' },
    description: 'Should handle single letter last name without format codes'
  },

  // COMPLEX NAMES
  {
    input: 'Bobbi King-Montgomery',
    expected: { full: 'Bobbi King-Montgomery', firstName: 'Bobbi', lastName: 'King-Montgomery' },
    description: 'Should handle hyphenated last names'
  },
  {
    input: 'Gaila Mackenzie-Strawn',
    expected: { full: 'Gaila Mackenzie-Strawn', firstName: 'Gaila', lastName: 'Mackenzie-Strawn' },
    description: 'Should handle hyphenated last names'
  },
  {
    input: 'Carmelle Jean-François',
    expected: { full: 'Carmelle Jean-François', firstName: 'Carmelle', lastName: 'Jean-François' },
    description: 'Should handle accented characters in hyphenated names'
  },
  {
    input: 'Ivette Espinosa-Fernandez DO FACOP',
    expected: { full: 'Ivette Espinosa-Fernandez', firstName: 'Ivette', lastName: 'Espinosa-Fernandez' },
    description: 'Should strip DO FACOP from hyphenated name'
  },

  // MIDDLE INITIAL PRESERVATION
  {
    input: 'John William Templeton',
    expected: { full: 'John William Templeton', firstName: 'John', lastName: 'Templeton' },
    description: 'Should handle full middle name'
  },
  {
    input: 'Neal Johnson DDS PhD MBA',
    expected: { full: 'Neal Johnson', firstName: 'Neal', lastName: 'Johnson' },
    description: 'Should strip multiple doctoral credentials'
  },

  // SPECIAL CHARACTERS
  {
    input: 'John Bell CFP®',
    expected: { full: 'John Bell', firstName: 'John', lastName: 'Bell' },
    description: 'Should strip credential with special character (®)'
  },
];

/**
 * Run all test cases and report results
 */
export function runTests(): { passed: number; failed: number; errors: Array<{ test: string; error: string }> } {
  let passed = 0;
  let failed = 0;
  const errors: Array<{ test: string; error: string }> = [];

  console.log('\n🧪 Running Name Normalization Test Suite...\n');

  for (const testCase of TEST_CASES) {
    try {
      const name = new NameEnhanced(testCase.input);
      
      const fullMatch = name.full === testCase.expected.full;
      const firstMatch = name.firstName === testCase.expected.firstName;
      const lastMatch = name.lastName === testCase.expected.lastName;
      
      if (fullMatch && firstMatch && lastMatch) {
        passed++;
        console.log(`✅ PASS: ${testCase.description}`);
        console.log(`   Input: "${testCase.input}"`);
        console.log(`   Output: "${name.full}"\n`);
      } else {
        failed++;
        const error = [
          `❌ FAIL: ${testCase.description}`,
          `   Input: "${testCase.input}"`,
          `   Expected: "${testCase.expected.full}"`,
          `   Got: "${name.full}"`,
          fullMatch ? '' : `   - Full name mismatch`,
          firstMatch ? '' : `   - First name: expected "${testCase.expected.firstName}", got "${name.firstName}"`,
          lastMatch ? '' : `   - Last name: expected "${testCase.expected.lastName}", got "${name.lastName}"`,
        ].filter(Boolean).join('\n');
        
        console.log(error + '\n');
        errors.push({ test: testCase.description, error });
      }
    } catch (e) {
      failed++;
      const error = `❌ ERROR: ${testCase.description}\n   ${e instanceof Error ? e.message : String(e)}\n`;
      console.log(error);
      errors.push({ test: testCase.description, error });
    }
  }

  console.log(`\n📊 Test Results: ${passed}/${TEST_CASES.length} passed, ${failed} failed\n`);

  return { passed, failed, errors };
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runTests();
  process.exit(results.failed > 0 ? 1 : 0);
}
