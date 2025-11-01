import { NameEnhanced } from './shared/normalization/names/NameEnhanced.js';
import { NameSplitter } from './shared/normalization/names/NameSplitter.js';
import fs from 'fs';

// Read first few rows
const csv = fs.readFileSync('/home/ubuntu/dclark_aids.csv', 'utf-8');
const lines = csv.split('\n').slice(0, 5); // First 5 rows

console.log('Testing CSV Processing\n');
console.log('='.repeat(80));

lines.forEach((line, idx) => {
  if (idx === 0) {
    console.log('Headers:', line);
    console.log('='.repeat(80));
    return;
  }
  
  const cols = line.split(',');
  const fullName = cols[0];
  const firstName = cols[1];
  const lastName = cols[2];
  
  console.log(`\nRow ${idx}:`);
  console.log(`  Input Name: "${fullName}"`);
  console.log(`  Input First: "${firstName}"`);
  console.log(`  Input Last: "${lastName}"`);
  
  // Process full name with splitting
  const split = NameSplitter.splitFullName(fullName);
  console.log(`  → Split Result: First="${split.firstName}" Last="${split.lastName}"`);
  
  // Process with NameEnhanced
  const nameEnhanced = new NameEnhanced(fullName);
  console.log(`  → NameEnhanced: First="${nameEnhanced.firstName}" Last="${nameEnhanced.lastName}"`);
});

console.log('\n' + '='.repeat(80));
console.log('Expected Output: Only "First Name" and "Last Name" columns (clean, no credentials)');
