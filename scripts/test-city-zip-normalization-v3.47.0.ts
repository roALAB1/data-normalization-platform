/**
 * Test Suite for v3.47.0 - Context-Aware City/ZIP Normalization
 * 
 * Tests:
 * 1. Title case conversion (austin → Austin)
 * 2. ZIP-to-city lookup (76903 → San Angelo)
 * 3. City-to-ZIP lookup (Houston → 77001)
 * 4. Cross-validation
 * 5. Confidence scoring
 */

import { ContextAwareNormalizer } from '../shared/normalization/cities/ContextAwareNormalizer';
import { CityRepairService } from '../shared/normalization/cities/CityRepairService';
import { ZIPRepairService } from '../shared/normalization/cities/ZIPRepairService';
import { ValidationService } from '../shared/normalization/cities/ValidationService';

interface TestCase {
  name: string;
  input: {
    city?: string;
    zipCode?: string;
    state?: string;
  };
  expected: {
    city: string;
    zipCode: string;
    minConfidence?: number;
  };
}

const testCases: TestCase[] = [
  // Title Case Tests
  {
    name: 'Lowercase city → Title case',
    input: { city: 'austin', zipCode: '78701' },
    expected: { city: 'Austin', zipCode: '78701', minConfidence: 0.9 },
  },
  {
    name: 'Uppercase city → Title case',
    input: { city: 'HOUSTON', zipCode: '77001' },
    expected: { city: 'Houston', zipCode: '77001', minConfidence: 0.9 },
  },
  {
    name: 'Mixed case city → Title case',
    input: { city: 'sAn AnToNiO', zipCode: '78201' },
    expected: { city: 'San Antonio', zipCode: '78201', minConfidence: 0.9 },
  },
  
  // ZIP-to-City Lookup Tests
  {
    name: 'ZIP in city column → City name',
    input: { city: '76903', zipCode: '76903' },
    expected: { city: 'San Angelo', zipCode: '76903', minConfidence: 0.8 },
  },
  {
    name: 'ZIP in city column (Dallas) → City name',
    input: { city: '75201', zipCode: '75201' },
    expected: { city: 'Dallas', zipCode: '75201', minConfidence: 0.8 },
  },
  
  // City-to-ZIP Lookup Tests
  {
    name: 'Missing ZIP + Houston → 77001',
    input: { city: 'Houston', zipCode: '', state: 'TX' },
    expected: { city: 'Houston', zipCode: '77001', minConfidence: 0.7 },
  },
  {
    name: 'Missing ZIP + Dallas → 75201',
    input: { city: 'Dallas', zipCode: '', state: 'TX' },
    expected: { city: 'Dallas', zipCode: '75201', minConfidence: 0.7 },
  },
  {
    name: 'Missing ZIP + Austin → 78701',
    input: { city: 'Austin', zipCode: '', state: 'TX' },
    expected: { city: 'Austin', zipCode: '78701', minConfidence: 0.7 },
  },
  
  // Fallback Database Tests
  {
    name: 'San Angelo fallback lookup',
    input: { city: 'San Angelo', zipCode: 'NaN', state: 'TX' },
    expected: { city: 'San Angelo', zipCode: '76903', minConfidence: 0.7 },
  },
  {
    name: 'Corpus Christi fallback lookup',
    input: { city: 'Corpus Christi', zipCode: '', state: 'TX' },
    expected: { city: 'Corpus Christi', zipCode: '78401', minConfidence: 0.7 },
  },
  
  // Edge Cases
  {
    name: 'Already correct → No change',
    input: { city: 'Austin', zipCode: '78701' },
    expected: { city: 'Austin', zipCode: '78701', minConfidence: 0.95 },
  },
  {
    name: 'Empty city → Empty city',
    input: { city: '', zipCode: '78701' },
    expected: { city: '', zipCode: '78701' },
  },
  {
    name: 'Empty ZIP with city → Repair ZIP',
    input: { city: 'Austin', zipCode: '' },
    expected: { city: 'Austin', zipCode: '78701', minConfidence: 0.8 },
  },
];

function runTests() {
  console.log('🧪 Running v3.47.0 City/ZIP Normalization Tests\n');
  console.log('='.repeat(80));
  
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];
  
  for (const test of testCases) {
    const result = ContextAwareNormalizer.normalize(test.input);
    
    const cityMatch = result.city === test.expected.city;
    const zipMatch = result.zipCode === test.expected.zipCode;
    const confidenceMatch = !test.expected.minConfidence || 
                           result.overallConfidence >= test.expected.minConfidence;
    
    const success = cityMatch && zipMatch && confidenceMatch;
    
    if (success) {
      passed++;
      console.log(`✅ ${test.name}`);
      console.log(`   Input:  city="${test.input.city}", zip="${test.input.zipCode}"`);
      console.log(`   Output: city="${result.city}", zip="${result.zipCode}", confidence=${result.overallConfidence.toFixed(2)}`);
    } else {
      failed++;
      failures.push(test.name);
      console.log(`❌ ${test.name}`);
      console.log(`   Input:    city="${test.input.city}", zip="${test.input.zipCode}"`);
      console.log(`   Expected: city="${test.expected.city}", zip="${test.expected.zipCode}"`);
      console.log(`   Got:      city="${result.city}", zip="${result.zipCode}", confidence=${result.overallConfidence.toFixed(2)}`);
      
      if (!cityMatch) console.log(`   ⚠️  City mismatch`);
      if (!zipMatch) console.log(`   ⚠️  ZIP mismatch`);
      if (!confidenceMatch) console.log(`   ⚠️  Confidence too low (${result.overallConfidence.toFixed(2)} < ${test.expected.minConfidence})`);
    }
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log(`\n📊 Test Results: ${passed}/${testCases.length} passed (${((passed / testCases.length) * 100).toFixed(1)}%)`);
  
  if (failed > 0) {
    console.log(`\n❌ Failed tests (${failed}):`);
    failures.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log('\n🎉 All tests passed!');
  }
  
  return { passed, failed, total: testCases.length };
}

// Run tests
runTests();
