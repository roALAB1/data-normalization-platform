#!/usr/bin/env node
/**
 * Test v3.44.0 improvements with 200 diverse addresses
 * Measures city/state/ZIP extraction rates
 */

import { normalizeAddress } from '../shared/normalization/addresses/AddressParser.ts';

const testAddresses = [
  // Standard addresses with ZIP
  { input: '123 Main St Durham NC 27701', expected: { city: 'Durham', state: 'NC', zip: '27701' } },
  { input: '456 Oak Ave Portland OR 97201', expected: { city: 'Portland', state: 'OR', zip: '97201' } },
  { input: '789 Elm St Seattle WA 98101', expected: { city: 'Seattle', state: 'WA', zip: '98101' } },
  
  // ZIP+4 addresses
  { input: '123 Main St Durham NC 27701-1234', expected: { city: 'Durham', state: 'NC', zip: '27701-1234' } },
  { input: '456 Oak Ave Portland OR 97201-5678', expected: { city: 'Portland', state: 'OR', zip: '97201-5678' } },
  { input: '789 Elm St Seattle WA 98101-2345', expected: { city: 'Seattle', state: 'WA', zip: '98101-2345' } },
  
  // Addresses without ZIP
  { input: '456 Maple Dr Springfield IL', expected: { city: 'Springfield', state: 'IL', zip: '' } },
  { input: '777 Pine St Boston MA', expected: { city: 'Boston', state: 'MA', zip: '' } },
  { input: '888 Cedar Ln Austin TX', expected: { city: 'Austin', state: 'TX', zip: '' } },
  
  // Addresses without street suffix
  { input: '123 Main Durham NC 27701', expected: { city: 'Durham', state: 'NC', zip: '27701' } },
  { input: '456 Broadway Austin TX 78701', expected: { city: 'Austin', state: 'TX', zip: '78701' } },
  { input: '789 Market Portland OR 97201', expected: { city: 'Portland', state: 'OR', zip: '97201' } },
  
  // Addresses with periods
  { input: '301 W. 6th St. Austin TX 78701', expected: { city: 'Austin', state: 'TX', zip: '78701' } },
  { input: '555 N. Main St. Durham NC 27701', expected: { city: 'Durham', state: 'NC', zip: '27701' } },
  { input: '777 S. Oak Ave. Portland OR 97201', expected: { city: 'Portland', state: 'OR', zip: '97201' } },
  
  // Addresses with hyphens in street names
  { input: '123 North-South Blvd Durham NC 27701', expected: { city: 'Durham', state: 'NC', zip: '27701' } },
  { input: '456 East-West Ave Portland OR 97201', expected: { city: 'Portland', state: 'OR', zip: '97201' } },
  { input: '789 Up-Down St Seattle WA 98101', expected: { city: 'Seattle', state: 'WA', zip: '98101' } },
  
  // Addresses with secondary components
  { input: '123 Main St Apt 402 Durham NC 27701', expected: { city: 'Durham', state: 'NC', zip: '27701' } },
  { input: '456 Oak Ave Suite 108 Portland OR 97201', expected: { city: 'Portland', state: 'OR', zip: '97201' } },
  { input: '789 Elm St Unit 5 Seattle WA 98101', expected: { city: 'Seattle', state: 'WA', zip: '98101' } },
  
  // Multi-word cities
  { input: '123 Main St Green City MO 63545', expected: { city: 'Green City', state: 'MO', zip: '63545' } },
  { input: '456 Oak Ave Sierra Vista AZ 85635', expected: { city: 'Sierra Vista', state: 'AZ', zip: '85635' } },
  { input: '789 Elm St Kansas City MO 64101', expected: { city: 'Kansas City', state: 'MO', zip: '64101' } },
  
  // Addresses with directional prefixes
  { input: '123 SE Main St Portland OR 97201', expected: { city: 'Portland', state: 'OR', zip: '97201' } },
  { input: '456 NW Oak Ave Seattle WA 98101', expected: { city: 'Seattle', state: 'WA', zip: '98101' } },
  { input: '789 NE Elm St Durham NC 27701', expected: { city: 'Durham', state: 'NC', zip: '27701' } },
  
  // Run-on addresses (no commas)
  { input: '815 S West St Green City MO 63545', expected: { city: 'Green City', state: 'MO', zip: '63545' } },
  { input: '1421 SW 27th Ave Ocala FL 34471', expected: { city: 'Ocala', state: 'FL', zip: '34471' } },
  { input: '2833 S 115th E Ave Tulsa OK 74128', expected: { city: 'Tulsa', state: 'OK', zip: '74128' } },
  
  // Edge cases from real data
  { input: '301 w6th st. ste 108 Austin TX 78701', expected: { city: 'Austin', state: 'TX', zip: '78701' } },
  { input: '5840 Willard Street. Casa', expected: { city: '', state: '', zip: '' } },
  { input: '819 E hughBert st Norman OK 73069', expected: { city: 'Norman', state: 'OK', zip: '73069' } },
  
  // Additional diverse addresses (170 more to reach 200)
  ...generateAdditionalAddresses(170)
];

function generateAdditionalAddresses(count) {
  const streets = ['Main', 'Oak', 'Elm', 'Pine', 'Maple', 'Cedar', 'Birch', 'Willow', 'Cherry', 'Walnut'];
  const suffixes = ['St', 'Ave', 'Rd', 'Blvd', 'Dr', 'Ln', 'Ct', 'Way', 'Pl', 'Ter'];
  const cities = ['Durham', 'Portland', 'Seattle', 'Austin', 'Boston', 'Chicago', 'Denver', 'Phoenix', 'Atlanta', 'Miami'];
  const states = ['NC', 'OR', 'WA', 'TX', 'MA', 'IL', 'CO', 'AZ', 'GA', 'FL'];
  
  const addresses = [];
  for (let i = 0; i < count; i++) {
    const num = 100 + Math.floor(Math.random() * 9900);
    const street = streets[i % streets.length];
    const suffix = suffixes[i % suffixes.length];
    const city = cities[i % cities.length];
    const state = states[i % states.length];
    const zip = 10000 + Math.floor(Math.random() * 89999);
    
    // Mix of formats
    const formats = [
      `${num} ${street} ${suffix} ${city} ${state} ${zip}`,
      `${num} ${street} ${suffix} ${city} ${state} ${zip}-${1000 + i}`,
      `${num} ${street} ${suffix} ${city} ${state}`,
      `${num} ${street} ${city} ${state} ${zip}`,
      `${num} ${street} ${suffix} Apt ${i + 1} ${city} ${state} ${zip}`,
    ];
    
    const format = formats[i % formats.length];
    const hasZip4 = format.includes('-');
    const hasZip = format.match(/\d{5}/);
    const expectedZip = hasZip4 ? format.match(/\d{5}-\d{4}/)?.[0] : hasZip?.[0] || '';
    
    addresses.push({
      input: format,
      expected: {
        city: city,
        state: state,
        zip: expectedZip
      }
    });
  }
  
  return addresses;
}

// Run tests
console.log('Testing v3.44.0 Address Parser with 200 addresses...\n');

let cityCorrect = 0;
let stateCorrect = 0;
let zipCorrect = 0;
let total = testAddresses.length;

const failures = [];

testAddresses.forEach((test, idx) => {
  const result = normalizeAddress(test.input);
  
  const cityMatch = result.city === test.expected.city;
  const stateMatch = result.state === test.expected.state;
  const zipMatch = result.zip === test.expected.zip;
  
  if (cityMatch) cityCorrect++;
  if (stateMatch) stateCorrect++;
  if (zipMatch) zipCorrect++;
  
  if (!cityMatch || !stateMatch || !zipMatch) {
    failures.push({
      index: idx + 1,
      input: test.input,
      expected: test.expected,
      actual: { city: result.city, state: result.state, zip: result.zip }
    });
  }
});

// Calculate rates
const cityRate = ((cityCorrect / total) * 100).toFixed(1);
const stateRate = ((stateCorrect / total) * 100).toFixed(1);
const zipRate = ((zipCorrect / total) * 100).toFixed(1);

console.log('=== RESULTS ===');
console.log(`Total addresses tested: ${total}`);
console.log(`\nExtraction Rates:`);
console.log(`  City:  ${cityCorrect}/${total} (${cityRate}%)`);
console.log(`  State: ${stateCorrect}/${total} (${stateRate}%)`);
console.log(`  ZIP:   ${zipCorrect}/${total} (${zipRate}%)`);

console.log(`\n=== COMPARISON TO v3.43.0 ===`);
console.log(`City:  ${cityRate}% (was 75%, +${(parseFloat(cityRate) - 75).toFixed(1)}%)`);
console.log(`State: ${stateRate}% (was 70%, +${(parseFloat(stateRate) - 70).toFixed(1)}%)`);
console.log(`ZIP:   ${zipRate}% (was 55%, +${(parseFloat(zipRate) - 55).toFixed(1)}%)`);

if (failures.length > 0) {
  console.log(`\n=== FAILURES (${failures.length}) ===`);
  failures.slice(0, 10).forEach(f => {
    console.log(`\n#${f.index}: ${f.input}`);
    console.log(`  Expected: city="${f.expected.city}", state="${f.expected.state}", zip="${f.expected.zip}"`);
    console.log(`  Actual:   city="${f.actual.city}", state="${f.actual.state}", zip="${f.actual.zip}"`);
  });
  if (failures.length > 10) {
    console.log(`\n... and ${failures.length - 10} more failures`);
  }
}

console.log('\n=== SUCCESS CRITERIA ===');
console.log(`City  >= 90%: ${parseFloat(cityRate) >= 90 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`State >= 90%: ${parseFloat(stateRate) >= 90 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`ZIP   >= 85%: ${parseFloat(zipRate) >= 85 ? '✅ PASS' : '❌ FAIL'}`);
