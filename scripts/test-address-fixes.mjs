#!/usr/bin/env node
/**
 * Test Address Normalization Fixes (v3.42.0)
 * 
 * Processes user's CSV files and generates before/after comparison report
 * to demonstrate improvements in:
 * 1. Secondary address stripping (Apt, Suite, Unit, #, etc.)
 * 2. Run-on address parsing (city/state extraction)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import AddressFormatter (which now uses AddressParser internally)
import { AddressFormatter } from '../shared/normalization/addresses/AddressFormatter.js';

// CSV parsing helper
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

// Main test function
async function testAddressNormalization() {
  console.log('='.repeat(80));
  console.log('Address Normalization Test - v3.42.0');
  console.log('='.repeat(80));
  console.log();
  
  const csvFiles = [
    '/home/ubuntu/upload/cleaned-1900-a-scores-carter-1_xvxe56.csv',
    '/home/ubuntu/upload/cleaned-results-3000-b-to-f-ca_1d54rwg.csv'
  ];
  
  const results = {
    totalAddresses: 0,
    secondaryAddressesStripped: 0,
    runOnAddressesParsed: 0,
    unchanged: 0,
    examples: []
  };
  
  for (const csvFile of csvFiles) {
    if (!fs.existsSync(csvFile)) {
      console.log(`⚠️  File not found: ${csvFile}`);
      continue;
    }
    
    console.log(`\n📄 Processing: ${path.basename(csvFile)}`);
    console.log('-'.repeat(80));
    
    const content = fs.readFileSync(csvFile, 'utf-8');
    const { headers, rows } = parseCSV(content);
    
    // Find address column (usually 5th column after First,Last,Phone,Email)
    const addressIndex = 4;
    
    let fileSecondaryCount = 0;
    let fileRunOnCount = 0;
    let fileUnchangedCount = 0;
    
    for (let i = 0; i < Math.min(rows.length, 100); i++) { // Test first 100 rows
      const row = rows[i];
      const values = Object.values(row);
      const originalAddress = values[addressIndex] || '';
      
      if (!originalAddress) continue;
      
      results.totalAddresses++;
      
      // Normalize address
      const normalizedAddress = AddressFormatter.format(originalAddress);
      
      // Detect what changed
      const hasSecondary = /\b(apt|apartment|ste|suite|unit|bldg|building|floor|fl|rm|room|#)\b/i.test(originalAddress);
      const hasStateZip = /\b[A-Z]{2}\b|\b\d{5}\b/.test(originalAddress);
      const changed = originalAddress.toLowerCase() !== normalizedAddress.toLowerCase();
      
      if (changed) {
        if (hasSecondary) {
          results.secondaryAddressesStripped++;
          fileSecondaryCount++;
          
          // Save example
          if (results.examples.length < 20) {
            results.examples.push({
              type: 'secondary',
              file: path.basename(csvFile),
              row: i + 2, // +2 for header and 0-index
              original: originalAddress,
              normalized: normalizedAddress
            });
          }
        } else if (hasStateZip) {
          results.runOnAddressesParsed++;
          fileRunOnCount++;
          
          // Save example
          if (results.examples.length < 20) {
            results.examples.push({
              type: 'runon',
              file: path.basename(csvFile),
              row: i + 2,
              original: originalAddress,
              normalized: normalizedAddress
            });
          }
        }
      } else {
        results.unchanged++;
        fileUnchangedCount++;
      }
    }
    
    console.log(`✅ Processed ${Math.min(rows.length, 100)} addresses`);
    console.log(`   - Secondary addresses stripped: ${fileSecondaryCount}`);
    console.log(`   - Run-on addresses parsed: ${fileRunOnCount}`);
    console.log(`   - Unchanged: ${fileUnchangedCount}`);
  }
  
  // Print summary
  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total addresses processed: ${results.totalAddresses}`);
  console.log(`Secondary addresses stripped: ${results.secondaryAddressesStripped} (${(results.secondaryAddressesStripped / results.totalAddresses * 100).toFixed(1)}%)`);
  console.log(`Run-on addresses parsed: ${results.runOnAddressesParsed} (${(results.runOnAddressesParsed / results.totalAddresses * 100).toFixed(1)}%)`);
  console.log(`Unchanged: ${results.unchanged} (${(results.unchanged / results.totalAddresses * 100).toFixed(1)}%)`);
  console.log();
  
  // Print examples
  console.log('='.repeat(80));
  console.log('EXAMPLES (Before → After)');
  console.log('='.repeat(80));
  console.log();
  
  const secondaryExamples = results.examples.filter(e => e.type === 'secondary').slice(0, 10);
  const runOnExamples = results.examples.filter(e => e.type === 'runon').slice(0, 10);
  
  if (secondaryExamples.length > 0) {
    console.log('📍 Secondary Address Stripping:');
    console.log();
    secondaryExamples.forEach((ex, i) => {
      console.log(`${i + 1}. [${ex.file}, Row ${ex.row}]`);
      console.log(`   BEFORE: ${ex.original}`);
      console.log(`   AFTER:  ${ex.normalized}`);
      console.log();
    });
  }
  
  if (runOnExamples.length > 0) {
    console.log('📍 Run-On Address Parsing:');
    console.log();
    runOnExamples.forEach((ex, i) => {
      console.log(`${i + 1}. [${ex.file}, Row ${ex.row}]`);
      console.log(`   BEFORE: ${ex.original}`);
      console.log(`   AFTER:  ${ex.normalized}`);
      console.log();
    });
  }
  
  console.log('='.repeat(80));
  console.log('✅ Test complete!');
  console.log('='.repeat(80));
  
  // Save detailed report
  const reportPath = '/home/ubuntu/name-normalization-demo/address-normalization-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📊 Detailed report saved to: ${reportPath}`);
}

// Run test
testAddressNormalization().catch(console.error);
