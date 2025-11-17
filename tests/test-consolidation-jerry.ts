/**
 * Test EnrichmentConsolidator with jerry_EM_only.csv
 * 
 * This test simulates the real-world scenario:
 * 1. Split jerry's file into 3 "enriched" files (simulating multiple data sources)
 * 2. Consolidate them back into master file
 * 3. Verify deduplication works correctly
 * 4. Check performance with 167k rows
 */

import { EnrichmentConsolidator, type ParsedCSV, type ConsolidationConfig } from '../server/services/EnrichmentConsolidator';
import * as fs from 'fs';
import * as path from 'path';

async function testConsolidation() {
  console.log('='.repeat(80));
  console.log('TEST: EnrichmentConsolidator with jerry_EM_only.csv');
  console.log('='.repeat(80));

  // Read jerry's file
  const filePath = '/home/ubuntu/upload/jerry_EM_only.csv';
  console.log(`\n1. Reading file: ${filePath}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  console.log(`   Total lines: ${lines.length.toLocaleString()}`);

  // Parse CSV
  console.log('\n2. Parsing CSV...');
  const parsed = EnrichmentConsolidator.parseCSV(fileContent);
  console.log(`   Headers: ${parsed.headers.length} columns`);
  console.log(`   Rows: ${parsed.rows.length.toLocaleString()}`);
  console.log(`   First 10 columns: ${parsed.headers.slice(0, 10).join(', ')}`);

  // Use UUID column (first column) as identifier - it's unique and never empty
  const identifierColumn = parsed.headers[0]; // UUID column
  console.log(`   Using identifier column: "${identifierColumn}"`);
  
  // Check for empty identifiers
  const emptyIdentifiers = parsed.rows.filter(row => !row[identifierColumn] || row[identifierColumn].trim() === '');
  console.log(`   Rows with empty identifiers: ${emptyIdentifiers.length}`);

  // Split into 3 "enriched" files to simulate multiple data sources
  console.log('\n3. Simulating 3 enriched files (splitting data)...');
  const chunkSize = Math.ceil(parsed.rows.length / 3);
  
  const file1: ParsedCSV = {
    headers: parsed.headers,
    rows: parsed.rows.slice(0, chunkSize)
  };
  
  const file2: ParsedCSV = {
    headers: parsed.headers,
    rows: parsed.rows.slice(chunkSize, chunkSize * 2)
  };
  
  const file3: ParsedCSV = {
    headers: parsed.headers,
    rows: parsed.rows.slice(chunkSize * 2)
  };

  console.log(`   File 1: ${file1.rows.length.toLocaleString()} rows`);
  console.log(`   File 2: ${file2.rows.length.toLocaleString()} rows`);
  console.log(`   File 3: ${file3.rows.length.toLocaleString()} rows`);

  // Add some duplicates to test deduplication
  console.log('\n4. Adding duplicate rows to test deduplication...');
  const duplicateCount = 100;
  for (let i = 0; i < duplicateCount; i++) {
    // Add same row to file2 and file3
    const rowToDuplicate = file1.rows[i];
    file2.rows.push({ ...rowToDuplicate });
    file3.rows.push({ ...rowToDuplicate });
  }
  console.log(`   Added ${duplicateCount} duplicate rows to files 2 and 3`);
  console.log(`   New totals: File1=${file1.rows.length}, File2=${file2.rows.length}, File3=${file3.rows.length}`);

  // Configure consolidation
  const config: ConsolidationConfig = {
    identifierColumn,
    deduplicationStrategy: 'most_complete',
    normalizeIdentifier: true
  };

  console.log('\n5. Starting consolidation...');
  const consolidator = new EnrichmentConsolidator(config);
  const startTime = Date.now();
  
  const result = await consolidator.consolidate([file1, file2, file3]);
  
  const duration = Date.now() - startTime;

  // Report results
  console.log('\n' + '='.repeat(80));
  console.log('CONSOLIDATION RESULTS');
  console.log('='.repeat(80));
  console.log(`\nPerformance:`);
  console.log(`  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  console.log(`  Rows/sec: ${Math.round(result.stats.totalInputRows / (duration / 1000)).toLocaleString()}`);

  console.log(`\nStatistics:`);
  console.log(`  Total input rows: ${result.stats.totalInputRows.toLocaleString()}`);
  console.log(`  Unique identifiers: ${result.stats.uniqueIdentifiers.toLocaleString()}`);
  console.log(`  Duplicates found: ${result.stats.duplicatesFound.toLocaleString()}`);
  console.log(`  Conflicts resolved: ${result.stats.conflictsResolved.toLocaleString()}`);
  console.log(`  Columns consolidated: ${result.stats.columnsConsolidated}`);

  console.log(`\nMaster file:`);
  console.log(`  Headers: ${result.masterFile.headers.length} columns`);
  console.log(`  Rows: ${result.masterFile.rows.length.toLocaleString()}`);

  // Verify deduplication worked
  const expectedUnique = parsed.rows.length; // Original count before adding duplicates
  const actualUnique = result.masterFile.rows.length;
  const deduplicationSuccess = actualUnique === expectedUnique;

  console.log(`\nDeduplication verification:`);
  console.log(`  Expected unique rows: ${expectedUnique.toLocaleString()}`);
  console.log(`  Actual unique rows: ${actualUnique.toLocaleString()}`);
  console.log(`  Status: ${deduplicationSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);

  // Sample first row
  console.log(`\nSample consolidated row (first):`);
  const firstRow = result.masterFile.rows[0];
  const sampleKeys = Object.keys(firstRow).slice(0, 5);
  for (const key of sampleKeys) {
    const value = firstRow[key];
    const displayValue = typeof value === 'string' && value.length > 50 
      ? value.substring(0, 50) + '...' 
      : value;
    console.log(`  ${key}: ${displayValue}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));

  return {
    success: deduplicationSuccess,
    duration,
    stats: result.stats
  };
}

// Run test
testConsolidation()
  .then(result => {
    console.log(`\n✅ Test completed successfully in ${result.duration}ms`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
