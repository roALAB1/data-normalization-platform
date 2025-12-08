import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { ContextAwareNormalizer } from '../shared/normalization/context-aware/ContextAwareNormalizer.ts';

async function processCSV(inputPath, outputPath) {
  console.log('Reading input CSV...');
  const csvContent = readFileSync(inputPath, 'utf-8');
  
  console.log('Parsing CSV...');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`Found ${records.length} rows`);
  
  // Detect columns
  const firstRow = records[0];
  const columns = Object.keys(firstRow);
  
  const cityCol = columns.find(c => c.toLowerCase() === 'city');
  const zipCol = columns.find(c => c.toLowerCase() === 'zip');
  const stateCol = columns.find(c => c.toLowerCase() === 'state');
  const countyCol = columns.find(c => c.toLowerCase() === 'county');
  const addressCol = columns.find(c => c.toLowerCase() === 'address');
  
  if (!cityCol || !zipCol) {
    throw new Error('Could not find city and zip columns');
  }
  
  console.log(`Columns detected: city=${cityCol}, zip=${zipCol}, state=${stateCol}, county=${countyCol}, address=${addressCol}`);
  
  // Create normalizer
  const normalizer = new ContextAwareNormalizer({
    repairCities: true,
    repairZIPs: true,
    crossValidate: true,
    confidenceThreshold: 70
  });
  
  console.log('\nNormalizing rows...');
  const startTime = Date.now();
  
  const normalizedRows = await normalizer.batchNormalize(
    records.map(record => ({
      city: record[cityCol],
      zip: record[zipCol],
      state: stateCol ? record[stateCol] : undefined,
      county: countyCol ? record[countyCol] : undefined,
      address: addressCol ? record[addressCol] : undefined
    }))
  );
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Normalized ${normalizedRows.length} rows in ${elapsed}s`);
  
  // Update records with normalized data
  const updatedRecords = records.map((record, index) => {
    const normalized = normalizedRows[index];
    return {
      ...record,
      [cityCol]: normalized.city,
      [zipCol]: normalized.zip,
      // Add metadata columns
      'city_original': normalized.cityRepair?.original || '',
      'city_repair_method': normalized.cityRepair?.method || '',
      'city_confidence': normalized.cityRepair?.confidence || '',
      'zip_original': normalized.zipRepair?.original || '',
      'zip_repair_method': normalized.zipRepair?.method || '',
      'zip_confidence': normalized.zipRepair?.confidence || '',
      'validation_valid': normalized.validation?.valid || '',
      'validation_issues': normalized.validation?.issues.join('; ') || '',
      'overall_confidence': normalized.overallConfidence
    };
  });
  
  console.log('Writing output CSV...');
  const outputCSV = stringify(updatedRecords, {
    header: true,
    quoted: true
  });
  
  writeFileSync(outputPath, outputCSV, 'utf-8');
  
  // Statistics
  const citiesRepaired = normalizedRows.filter(r => r.cityRepair?.needsRepair).length;
  const zipsRepaired = normalizedRows.filter(r => r.zipRepair?.needsRepair).length;
  const validationFailures = normalizedRows.filter(r => r.validation && !r.validation.valid).length;
  
  const cityRepairMethods = {};
  const zipRepairMethods = {};
  
  normalizedRows.forEach(r => {
    if (r.cityRepair) {
      cityRepairMethods[r.cityRepair.method] = (cityRepairMethods[r.cityRepair.method] || 0) + 1;
    }
    if (r.zipRepair) {
      zipRepairMethods[r.zipRepair.method] = (zipRepairMethods[r.zipRepair.method] || 0) + 1;
    }
  });
  
  const totalConfidence = normalizedRows.reduce((sum, r) => sum + r.overallConfidence, 0);
  const averageConfidence = totalConfidence / normalizedRows.length;
  
  console.log('\n=== STATISTICS ===');
  console.log(`Total rows: ${normalizedRows.length}`);
  console.log(`Cities repaired: ${citiesRepaired}`);
  console.log(`ZIPs repaired: ${zipsRepaired}`);
  console.log(`Validation failures: ${validationFailures}`);
  console.log(`Average confidence: ${averageConfidence.toFixed(2)}%`);
  
  console.log('\n=== CITY REPAIR METHODS ===');
  Object.entries(cityRepairMethods).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });
  
  console.log('\n=== ZIP REPAIR METHODS ===');
  Object.entries(zipRepairMethods).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });
  
  console.log(`\n✅ Output saved to: ${outputPath}`);
  
  // Check for NaN ZIPs
  const nanZips = updatedRecords.filter(r => {
    const zip = r[zipCol];
    return !zip || zip === 'nan' || zip === 'NaN' || zip === '';
  });
  
  console.log(`\n🔍 Rows with NaN/empty ZIP: ${nanZips.length}`);
  
  if (nanZips.length > 0) {
    console.log('\nSample NaN ZIP rows:');
    nanZips.slice(0, 10).forEach((row, i) => {
      console.log(`  ${i + 1}. City: ${row[cityCol]}, State: ${row[stateCol]}, County: ${row[countyCol]}, Method: ${row.zip_repair_method}, Confidence: ${row.zip_confidence}`);
    });
  }
  
  return {
    total: normalizedRows.length,
    nanCount: nanZips.length,
    repaired: zipsRepaired
  };
}

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error('Usage: node reprocess-csv-standalone.mjs <input.csv> <output.csv>');
  process.exit(1);
}

processCSV(inputPath, outputPath).catch(error => {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
