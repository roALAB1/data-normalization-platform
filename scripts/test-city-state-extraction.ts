/**
 * Test script for v3.43.0 - City/State Extraction
 * 
 * Tests the new normalizeAddress() function that returns { street, city, state, zip }
 * instead of just a string.
 */

import { normalizeAddress } from '../shared/normalization/addresses/AddressParser';
import fs from 'fs';
import Papa from 'papaparse';

// Sample addresses from user's CSV files
const testAddresses = [
  // From cleaned-1900-a-scores-carter-1_xvxe56.csv
  '2833 s 115th E. Ave. Apt G',
  '1421 sw 27th ave apt 402 Ocala fl',
  '819 E hughBert st Norman',
  '5840 Willard Street. Casa',
  '100 E Vaughn Rd Apt. 2111',
  
  // From cleaned-results-3000-b-to-f-ca_1d54rwg.csv
  '815 S West St Green City MO 63545',
  '301 w6th st. ste 108',
  '4426 E Lee St Unit 2',
  '100 riverbend dr apt i11 West Columbia SC',
  '4801 Sugar Hill Rd SE apt b Temple GA',
  '11133 ellis lane parks ar 72950',
  '5374 Desert Shadows Dr Sierra Vista AZ 85635',
  
  // Additional test cases
  '123 Main St Durham NC 27701',
  '456 Oak Ave Rancho Santa Fe CA 92067',
  '789 Elm St Apt 402 Portland OR 97201',
  '321 Pine Blvd #1124 Austin TX 78701',
  '654 Maple Dr Springfield IL 62701',
  '987 Cedar Ln Kansas City MO 64101',
  '147 Birch Ave New York NY 10001',
  '258 Willow St Los Angeles CA 90001'
];

console.log('='.repeat(80));
console.log('v3.43.0 - City/State Extraction Test');
console.log('='.repeat(80));
console.log();

const results: any[] = [];

testAddresses.forEach((address, index) => {
  const result = normalizeAddress(address);
  
  console.log(`[${index + 1}/${testAddresses.length}] ${address}`);
  console.log(`  Street: "${result.street}"`);
  console.log(`  City:   "${result.city}"`);
  console.log(`  State:  "${result.state}"`);
  console.log(`  ZIP:    "${result.zip}"`);
  console.log();
  
  results.push({
    original: address,
    street: result.street,
    city: result.city,
    state: result.state,
    zip: result.zip
  });
});

// Generate summary statistics
const withCity = results.filter(r => r.city !== '').length;
const withState = results.filter(r => r.state !== '').length;
const withZip = results.filter(r => r.zip !== '').length;

console.log('='.repeat(80));
console.log('Summary Statistics');
console.log('='.repeat(80));
console.log(`Total addresses tested: ${results.length}`);
console.log(`Addresses with city extracted: ${withCity} (${(withCity / results.length * 100).toFixed(1)}%)`);
console.log(`Addresses with state extracted: ${withState} (${(withState / results.length * 100).toFixed(1)}%)`);
console.log(`Addresses with ZIP extracted: ${withZip} (${(withZip / results.length * 100).toFixed(1)}%)`);
console.log();

// Save results to CSV
const csv = Papa.unparse({
  fields: ['original', 'street', 'city', 'state', 'zip'],
  data: results
});

const outputPath = '/home/ubuntu/name-normalization-demo/city-state-extraction-test-results.csv';
fs.writeFileSync(outputPath, csv);
console.log(`Results saved to: ${outputPath}`);
console.log();

// Test with actual user CSV files if they exist
const csvFiles = [
  '/home/ubuntu/Downloads/cleaned-1900-a-scores-carter-1_xvxe56.csv',
  '/home/ubuntu/Downloads/cleaned-results-3000-b-to-f-ca_1d54rwg.csv'
];

for (const csvFile of csvFiles) {
  if (fs.existsSync(csvFile)) {
    console.log('='.repeat(80));
    console.log(`Testing with: ${csvFile}`);
    console.log('='.repeat(80));
    
    const content = fs.readFileSync(csvFile, 'utf-8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    
    // Find address column
    const headers = parsed.meta.fields || [];
    const addressColumn = headers.find(h => 
      h.toLowerCase().includes('address') || 
      h.toLowerCase().includes('street')
    );
    
    if (!addressColumn) {
      console.log('  ⚠️  No address column found');
      console.log();
      continue;
    }
    
    console.log(`  Address column: "${addressColumn}"`);
    console.log(`  Total rows: ${parsed.data.length}`);
    
    // Sample 50 addresses
    const sample = (parsed.data as any[]).slice(0, 50);
    const sampleResults: any[] = [];
    
    sample.forEach(row => {
      const address = row[addressColumn];
      if (!address) return;
      
      const result = normalizeAddress(address);
      sampleResults.push({
        original: address,
        street: result.street,
        city: result.city,
        state: result.state,
        zip: result.zip
      });
    });
    
    const sampleWithCity = sampleResults.filter(r => r.city !== '').length;
    const sampleWithState = sampleResults.filter(r => r.state !== '').length;
    const sampleWithZip = sampleResults.filter(r => r.zip !== '').length;
    
    console.log(`  Sample size: ${sampleResults.length}`);
    console.log(`  City extracted: ${sampleWithCity} (${(sampleWithCity / sampleResults.length * 100).toFixed(1)}%)`);
    console.log(`  State extracted: ${sampleWithState} (${(sampleWithState / sampleResults.length * 100).toFixed(1)}%)`);
    console.log(`  ZIP extracted: ${sampleWithZip} (${(sampleWithZip / sampleResults.length * 100).toFixed(1)}%)`);
    console.log();
    
    // Show first 5 examples
    console.log('  First 5 examples:');
    sampleResults.slice(0, 5).forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.original}`);
      console.log(`       → Street: "${r.street}"`);
      console.log(`       → City: "${r.city}", State: "${r.state}", ZIP: "${r.zip}"`);
    });
    console.log();
  }
}

console.log('='.repeat(80));
console.log('Test Complete');
console.log('='.repeat(80));
