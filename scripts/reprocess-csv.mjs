import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Simple implementation for testing - will use the API endpoint instead
async function processCSV(inputPath, outputPath) {
  console.log('Reading input CSV...');
  const csvContent = readFileSync(inputPath, 'utf-8');
  
  console.log('Sending to normalization API...');
  const response = await fetch('http://localhost:3000/api/normalize-csv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      csvContent,
      options: {
        repairCities: true,
        repairZIPs: true,
        crossValidate: true,
        confidenceThreshold: 70,
        includeMetadata: true
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`Processing failed: ${result.error}`);
  }
  
  console.log('Writing output CSV...');
  writeFileSync(outputPath, result.normalizedCSV, 'utf-8');
  
  console.log('\n=== STATISTICS ===');
  console.log(`Total rows: ${result.stats.total}`);
  console.log(`Cities repaired: ${result.stats.citiesRepaired}`);
  console.log(`ZIPs repaired: ${result.stats.zipsRepaired}`);
  console.log(`Validation failures: ${result.stats.validationFailures}`);
  console.log(`Average confidence: ${result.stats.averageConfidence.toFixed(2)}%`);
  
  console.log('\n=== CITY REPAIR METHODS ===');
  Object.entries(result.stats.cityRepairMethods).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });
  
  console.log('\n=== ZIP REPAIR METHODS ===');
  Object.entries(result.stats.zipRepairMethods).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });
  
  console.log('\n=== VALIDATION ISSUES ===');
  Object.entries(result.stats.validationIssues).forEach(([issue, count]) => {
    console.log(`  ${issue}: ${count}`);
  });
  
  console.log(`\n✅ Output saved to: ${outputPath}`);
  
  // Check for NaN ZIPs
  const outputContent = readFileSync(outputPath, 'utf-8');
  const outputRecords = parse(outputContent, { columns: true });
  const nanZips = outputRecords.filter(r => r.zip === 'nan' || r.zip === 'NaN' || r.zip === '');
  console.log(`\n🔍 Rows with NaN/empty ZIP: ${nanZips.length}`);
  
  if (nanZips.length > 0) {
    console.log('\nSample NaN ZIP rows:');
    nanZips.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i + 1}. City: ${row.city}, State: ${row.state}, Method: ${row.zip_repair_method}`);
    });
  }
}

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error('Usage: node reprocess-csv.mjs <input.csv> <output.csv>');
  process.exit(1);
}

processCSV(inputPath, outputPath).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
