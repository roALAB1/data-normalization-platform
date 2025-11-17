/**
 * End-to-End CRM Merge Test
 * 
 * Tests the complete two-phase workflow:
 * 1. Consolidate multiple enriched files into master file
 * 2. Match master file with original CRM file
 * 3. Verify enriched data appears in output
 */

import { CRMMergeProcessor } from '../server/services/CRMMergeProcessor';
import type { CRMMergeJobData, FileMetadata } from '../shared/crmMergeTypes';
import * as fs from 'fs';

async function testCRMMerge() {
  console.log('='.repeat(80));
  console.log('END-TO-END CRM MERGE TEST');
  console.log('='.repeat(80));

  // Read jerry's file
  const filePath = '/home/ubuntu/upload/jerry_EM_only.csv';
  console.log(`\n1. Reading file: ${filePath}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  const headers = lines[0].split(',');
  
  console.log(`   Total lines: ${lines.length.toLocaleString()}`);
  console.log(`   Headers: ${headers.length} columns`);
  console.log(`   First 10 columns: ${headers.slice(0, 10).join(', ')}`);

  // Simulate scenario: 
  // - Original CRM file has basic info (UUID, name, address)
  // - Enriched files have additional data (phones, emails, company)
  
  console.log('\n2. Creating test scenario...');
  console.log('   Scenario: Original CRM + 2 Enriched Files');
  
  // Take first 1000 rows for faster testing
  const testLines = lines.slice(0, 1001); // Header + 1000 rows
  const testContent = testLines.join('\n');
  
  // Write test files
  const testDir = '/tmp/crm-merge-test';
  fs.mkdirSync(testDir, { recursive: true });
  
  // Original file: Just UUID, name, address (columns 0-6)
  const originalHeaders = headers.slice(0, 7);
  const originalLines = testLines.map((line, i) => {
    if (i === 0) return originalHeaders.join(',');
    const cols = line.split(',');
    return cols.slice(0, 7).join(',');
  });
  const originalPath = `${testDir}/original.csv`;
  fs.writeFileSync(originalPath, originalLines.join('\n'));
  console.log(`   Created original file: ${originalPath} (${originalHeaders.length} columns)`);
  
  // Enriched file 1: UUID + phones (columns 0, 14-19)
  const enriched1Headers = [headers[0], ...headers.slice(14, 20)];
  const enriched1Lines = testLines.map((line, i) => {
    if (i === 0) return enriched1Headers.join(',');
    const cols = line.split(',');
    return [cols[0], ...cols.slice(14, 20)].join(',');
  });
  const enriched1Path = `${testDir}/enriched1.csv`;
  fs.writeFileSync(enriched1Path, enriched1Lines.join('\n'));
  console.log(`   Created enriched file 1: ${enriched1Path} (${enriched1Headers.length} columns - phones)`);
  
  // Enriched file 2: UUID + emails (columns 0, 20-24)
  const enriched2Headers = [headers[0], ...headers.slice(20, 25)];
  const enriched2Lines = testLines.map((line, i) => {
    if (i === 0) return enriched2Headers.join(',');
    const cols = line.split(',');
    return [cols[0], ...cols.slice(20, 25)].join(',');
  });
  const enriched2Path = `${testDir}/enriched2.csv`;
  fs.writeFileSync(enriched2Path, enriched2Lines.join('\n'));
  console.log(`   Created enriched file 2: ${enriched2Path} (${enriched2Headers.length} columns - emails)`);

  // Create file metadata
  const originalFile: FileMetadata = {
    id: 'original',
    name: 'original.csv',
    type: 'original',
    s3Key: 'test/original.csv',
    s3Url: originalPath, // Direct file path for testing
    rowCount: 1000,
    columns: originalHeaders
  };

  const enrichedFiles: FileMetadata[] = [
    {
      id: 'enriched1',
      name: 'enriched1.csv',
      type: 'enriched',
      s3Key: 'test/enriched1.csv',
      s3Url: enriched1Path, // Direct file path for testing
      rowCount: 1000,
      columns: enriched1Headers
    },
    {
      id: 'enriched2',
      name: 'enriched2.csv',
      type: 'enriched',
      s3Key: 'test/enriched2.csv',
      s3Url: enriched2Path, // Direct file path for testing
      rowCount: 1000,
      columns: enriched2Headers
    }
  ];

  // Create job data
  const jobData: CRMMergeJobData = {
    jobId: 1,
    userId: 1,
    originalFile,
    enrichedFiles,
    selectedIdentifiers: [headers[0]], // UUID
    inputMappings: [
      { originalColumn: headers[0], enrichedColumn: headers[0], enrichedFileId: 'enriched1' },
      { originalColumn: headers[0], enrichedColumn: headers[0], enrichedFileId: 'enriched2' }
    ],
    arrayStrategies: {},
    resolutionConfig: {
      defaultStrategy: 'use_enriched',
      columnStrategies: {},
      alternateFieldSuffix: '_enriched'
    },
    columnConfigs: [],
    orderingMode: 'append'
  };

  console.log('\n3. Running CRM merge processor...');
  const processor = new CRMMergeProcessor(jobData, (progress) => {
    if (progress.percentage % 20 === 0 || progress.stage === 'complete') {
      console.log(`   [${progress.stage}] ${progress.percentage}% - ${progress.message}`);
    }
  });

  const startTime = Date.now();
  const result = await processor.process();
  const duration = Date.now() - startTime;

  console.log('\n' + '='.repeat(80));
  console.log('MERGE RESULTS');
  console.log('='.repeat(80));
  console.log(`\nPerformance:`);
  console.log(`  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

  console.log(`\nMatch Statistics:`);
  console.log(`  Total original rows: ${result.matchStats.totalOriginalRows.toLocaleString()}`);
  console.log(`  Total enriched rows: ${result.matchStats.totalEnrichedRows.toLocaleString()}`);
  console.log(`  Matched rows: ${result.matchStats.matchedRows.toLocaleString()}`);
  console.log(`  Unmatched rows: ${result.matchStats.unmatchedRows.toLocaleString()}`);
  console.log(`  Match rate: ${((result.matchStats.matchedRows / result.matchStats.totalOriginalRows) * 100).toFixed(1)}%`);

  console.log(`\nOutput:`);
  console.log(`  Output rows: ${result.outputRowCount.toLocaleString()}`);

  // Parse output CSV to verify enriched data
  console.log('\n4. Verifying enriched data in output...');
  
  // DEBUG: Check what's in result
  console.log('\n   DEBUG: result.outputFileKey:', result.outputFileKey);
  console.log('   DEBUG: result.outputFileUrl type:', typeof result.outputFileUrl);
  console.log('   DEBUG: result.outputFileUrl length:', result.outputFileUrl?.length || 0);
  console.log('   DEBUG: First 200 chars:', result.outputFileUrl?.substring(0, 200));
  
  const outputLines = result.outputFileUrl.split('\n'); // Temporary: result contains CSV string
  
  // Check if output has enriched columns
  const outputHeaders = outputLines[0]?.split(',') || [];
  const hasPhoneColumns = enriched1Headers.slice(1).some(h => outputHeaders.includes(h));
  const hasEmailColumns = enriched2Headers.slice(1).some(h => outputHeaders.includes(h));
  
  console.log(`   Output has ${outputHeaders.length} columns`);
  console.log(`   Original columns: ${originalHeaders.length}`);
  console.log(`   Enriched phone columns present: ${hasPhoneColumns ? '✅ YES' : '❌ NO'}`);
  console.log(`   Enriched email columns present: ${hasEmailColumns ? '✅ YES' : '❌ NO'}`);

  // Check first data row
  if (outputLines.length > 1) {
    const firstDataRow = outputLines[1].split(',');
    console.log(`\n   First row sample (first 10 values):`);
    for (let i = 0; i < Math.min(10, firstDataRow.length); i++) {
      const value = firstDataRow[i];
      const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`     [${i}] ${outputHeaders[i]}: ${displayValue}`);
    }
  }

  const success = result.success && hasPhoneColumns && hasEmailColumns;

  console.log('\n' + '='.repeat(80));
  console.log(`TEST RESULT: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log('='.repeat(80));

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });

  return { success, result };
}

// Run test
testCRMMerge()
  .then(({ success, result }) => {
    if (success) {
      console.log(`\n✅ End-to-end test PASSED!`);
      console.log(`   Enriched data successfully merged into output CSV`);
      process.exit(0);
    } else {
      console.error(`\n❌ End-to-end test FAILED!`);
      console.error(`   Enriched data NOT appearing in output CSV`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
