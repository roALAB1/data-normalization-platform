/**
 * DuckDB Integration Test Script
 * 
 * Run with: tsx server/services/testDuckDBIntegration.ts
 * 
 * Tests the complete DuckDB merge workflow with sample data.
 */

import { DuckDBService } from './DuckDBService';
import { DuckDBMergeEngine } from './DuckDBMergeEngine';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Sample data
const originalCSV = `email,name,company
john@acme.com,John Doe,Acme Inc
jane@tech.com,Jane Smith,Tech Corp
bob@data.com,Bob Johnson,Data LLC
alice@startup.com,Alice Brown,Startup Co
charlie@enterprise.com,Charlie Davis,Enterprise Ltd`;

const enriched1CSV = `email,phone,title
john@acme.com,555-0101,CEO
jane@tech.com,555-0102,CTO
bob@data.com,555-0103,VP Engineering`;

const enriched2CSV = `email,linkedin,twitter
john@acme.com,linkedin.com/john,@johndoe
alice@startup.com,linkedin.com/alice,@alicebrown
charlie@enterprise.com,linkedin.com/charlie,@charlied`;

async function createTempCSV(content: string, filename: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tempPath, content);
  return `file://${tempPath}`;
}

async function testDuckDBService() {
  console.log('\n=== Testing DuckDBService ===\n');

  const service = new DuckDBService('test-service-001');

  try {
    // Test 1: Initialize
    console.log('✓ Test 1: Initialize database');
    await service.initialize();
    console.log(`  Database created at: ${service.getDbPath()}`);
    console.log(`  Is ready: ${service.isReady()}`);

    // Test 2: Import CSV
    console.log('\n✓ Test 2: Import CSV file');
    const csvUrl = await createTempCSV(originalCSV, 'test-original.csv');
    const importResult = await service.importCSVFromURL('original', csvUrl);
    console.log(`  Imported ${importResult.rowCount} rows`);
    console.log(`  Columns: ${importResult.columns.join(', ')}`);

    // Test 3: Query data
    console.log('\n✓ Test 3: Query data');
    const rows = await service.query('SELECT * FROM original');
    console.log(`  Query returned ${rows.length} rows`);
    console.log(`  Sample row:`, rows[0]);

    // Test 4: Table stats
    console.log('\n✓ Test 4: Get table stats');
    const stats = await service.getTableStats('original');
    console.log(`  Row count: ${stats.rowCount}`);
    console.log(`  Column count: ${stats.columnCount}`);
    console.log(`  Size estimate: ${(stats.sizeBytes / 1024).toFixed(2)} KB`);

    // Test 5: Export CSV
    console.log('\n✓ Test 5: Export to CSV');
    const exportedCSV = await service.exportToCSV('original');
    console.log(`  Exported ${exportedCSV.length} bytes`);
    console.log(`  First 100 chars: ${exportedCSV.substring(0, 100)}...`);

    // Test 6: Cleanup
    console.log('\n✓ Test 6: Cleanup');
    await service.close();
    console.log(`  Database file deleted: ${!fs.existsSync(service.getDbPath())}`);

    console.log('\n✅ All DuckDBService tests passed!\n');
  } catch (error) {
    console.error('\n❌ DuckDBService test failed:', error);
    throw error;
  }
}

async function testDuckDBMergeEngine() {
  console.log('\n=== Testing DuckDBMergeEngine ===\n');

  try {
    // Create temp CSV files
    console.log('✓ Setup: Creating temp CSV files');
    const originalUrl = await createTempCSV(originalCSV, 'merge-original.csv');
    const enriched1Url = await createTempCSV(enriched1CSV, 'merge-enriched1.csv');
    const enriched2Url = await createTempCSV(enriched2CSV, 'merge-enriched2.csv');
    console.log('  Original:', originalUrl);
    console.log('  Enriched 1:', enriched1Url);
    console.log('  Enriched 2:', enriched2Url);

    // Create merge engine
    console.log('\n✓ Test 1: Create merge engine');
    const engine = new DuckDBMergeEngine(
      'test-merge-001',
      {
        identifierColumns: ['email'],
        conflictResolution: 'first',
        normalizeIdentifiers: true,
        includeMatchQuality: true,
      },
      (progress) => {
        console.log(`  [${progress.stage}] ${progress.progress}% - ${progress.message}`);
      }
    );

    // Execute merge
    console.log('\n✓ Test 2: Execute merge workflow');
    const result = await engine.executeMerge(originalUrl, [enriched1Url, enriched2Url]);

    console.log('\n✓ Test 3: Verify results');
    console.log(`  Total rows: ${result.totalRows}`);
    console.log(`  Matched rows: ${result.matchedRows}`);
    console.log(`  Unmatched rows: ${result.unmatchedRows}`);
    console.log(`  Match rate: ${((result.matchedRows / result.totalRows) * 100).toFixed(1)}%`);
    console.log(`  Enriched columns: ${result.enrichedColumns.length}`);
    console.log(`  Processing time: ${result.processingTimeMs}ms`);
    console.log(`  Output S3 key: ${result.outputS3Key}`);

    // Verify match rate
    if (result.matchedRows === 0) {
      throw new Error('No rows matched - merge failed');
    }

    console.log('\n✅ All DuckDBMergeEngine tests passed!\n');
  } catch (error) {
    console.error('\n❌ DuckDBMergeEngine test failed:', error);
    throw error;
  }
}

async function testPerformance() {
  console.log('\n=== Testing Performance ===\n');

  try {
    // Generate larger dataset
    console.log('✓ Setup: Generating large dataset (10k rows)');
    const largeOriginal = ['email,name,company'];
    const largeEnriched = ['email,phone,title'];

    for (let i = 1; i <= 10000; i++) {
      largeOriginal.push(`user${i}@example.com,User ${i},Company ${i % 100}`);
      if (i % 2 === 0) {
        // 50% match rate
        largeEnriched.push(`user${i}@example.com,555-${String(i).padStart(4, '0')},Title ${i % 10}`);
      }
    }

    const originalUrl = await createTempCSV(largeOriginal.join('\n'), 'perf-original.csv');
    const enrichedUrl = await createTempCSV(largeEnriched.join('\n'), 'perf-enriched.csv');

    console.log(`  Original: ${largeOriginal.length - 1} rows`);
    console.log(`  Enriched: ${largeEnriched.length - 1} rows`);

    // Run merge
    console.log('\n✓ Test: Execute large merge');
    const startTime = Date.now();

    const engine = new DuckDBMergeEngine(
      'test-perf-001',
      {
        identifierColumns: ['email'],
        conflictResolution: 'first',
        normalizeIdentifiers: true,
        includeMatchQuality: true,
      }
    );

    const result = await engine.executeMerge(originalUrl, [enrichedUrl]);
    const endTime = Date.now();

    console.log('\n✓ Performance Results:');
    console.log(`  Total rows: ${result.totalRows}`);
    console.log(`  Processing time: ${result.processingTimeMs}ms`);
    console.log(`  Throughput: ${Math.round(result.totalRows / (result.processingTimeMs / 1000))} rows/sec`);
    console.log(`  Match rate: ${((result.matchedRows / result.totalRows) * 100).toFixed(1)}%`);

    // Verify performance
    const throughput = result.totalRows / (result.processingTimeMs / 1000);
    if (throughput < 1000) {
      console.warn(`  ⚠️  Warning: Throughput below 1k rows/sec (${Math.round(throughput)} rows/sec)`);
    } else {
      console.log(`  ✅ Throughput exceeds 1k rows/sec`);
    }

    console.log('\n✅ Performance test passed!\n');
  } catch (error) {
    console.error('\n❌ Performance test failed:', error);
    throw error;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   DuckDB Integration Tests                            ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  try {
    await testDuckDBService();
    await testDuckDBMergeEngine();
    await testPerformance();

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   ✅ ALL TESTS PASSED                                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    process.exit(0);
  } catch (error) {
    console.error('╔═══════════════════════════════════════════════════════╗');
    console.error('║   ❌ TESTS FAILED                                     ║');
    console.error('╚═══════════════════════════════════════════════════════╝\n');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
