import { CSVNormalizationProcessor } from './server/services/CSVNormalizationProcessor';
import { readFile, writeFile } from 'fs/promises';

async function main() {
  console.log('🚀 Starting Texas Bars CSV Normalization...\n');

  // Initialize processor
  const processor = new CSVNormalizationProcessor({
    repairCities: true,
    repairZIPs: true,
    crossValidate: true,
    confidenceThreshold: 70,
    includeMetadata: true
  });

  try {
    // Process the CSV
    console.log('📂 Reading input file...');
    const inputPath = '/home/ubuntu/upload/bars_texas_final_clean_after_stage2.csv';
    const result = await processor.processCSVFile(inputPath);

    if (!result.success) {
      console.error('❌ Processing failed:', result.error);
      process.exit(1);
    }

    // Save normalized CSV
    console.log('💾 Saving normalized CSV...');
    const outputPath = '/home/ubuntu/bars_texas_normalized_output.csv';
    await writeFile(outputPath, result.normalizedCSV, 'utf-8');

    // Display statistics
    console.log('\n' + '='.repeat(80));
    console.log('📊 NORMALIZATION STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total rows processed: ${result.stats.total}`);
    console.log(`Cities repaired: ${result.stats.citiesRepaired}`);
    console.log(`ZIP codes repaired: ${result.stats.zipsRepaired}`);
    console.log(`Validation failures: ${result.stats.validationFailures}`);
    console.log(`Average confidence: ${result.stats.averageConfidence}%`);

    console.log('\n' + '-'.repeat(80));
    console.log('🔧 CITY REPAIR METHODS:');
    console.log('-'.repeat(80));
    Object.entries(result.stats.cityRepairMethods).forEach(([method, count]) => {
      console.log(`  ${method}: ${count}`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log('📮 ZIP REPAIR METHODS:');
    console.log('-'.repeat(80));
    Object.entries(result.stats.zipRepairMethods).forEach(([method, count]) => {
      console.log(`  ${method}: ${count}`);
    });

    if (Object.keys(result.stats.validationIssues).length > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('⚠️  VALIDATION ISSUES:');
      console.log('-'.repeat(80));
      Object.entries(result.stats.validationIssues).forEach(([issue, count]) => {
        console.log(`  ${issue}: ${count}`);
      });
    }

    // Show rows that need review
    if (result.needsReview.length > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log(`🔍 ROWS NEEDING REVIEW (${result.needsReview.length} total):`);
      console.log('-'.repeat(80));
      
      // Show first 10 rows that need review
      result.needsReview.slice(0, 10).forEach((row, index) => {
        console.log(`\n${index + 1}. City: "${row.city}" | ZIP: "${row.zip}" | Confidence: ${row.overallConfidence}%`);
        if (row.cityRepair?.needsRepair) {
          console.log(`   City repair: "${row.cityRepair.original}" → "${row.cityRepair.city}" (${row.cityRepair.method})`);
        }
        if (row.zipRepair?.needsRepair) {
          console.log(`   ZIP repair: "${row.zipRepair.original}" → "${row.zipRepair.zip}" (${row.zipRepair.method})`);
        }
        if (row.validation && !row.validation.valid) {
          console.log(`   Validation issues: ${row.validation.issues.join(', ')}`);
        }
      });

      if (result.needsReview.length > 10) {
        console.log(`\n   ... and ${result.needsReview.length - 10} more rows`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS!');
    console.log('='.repeat(80));
    console.log(`📁 Normalized CSV saved to: ${outputPath}`);
    console.log(`📊 Total rows: ${result.stats.total}`);
    console.log(`✨ Repairs made: ${result.stats.citiesRepaired + result.stats.zipsRepaired}`);
    console.log(`🎯 Average confidence: ${result.stats.averageConfidence}%`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
