import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { ContextAwareNormalizer, NormalizedRow, NormalizationStats } from '../../shared/normalization/context-aware';

export interface ProcessingOptions {
  repairCities?: boolean;
  repairZIPs?: boolean;
  crossValidate?: boolean;
  confidenceThreshold?: number;
  includeMetadata?: boolean;
}

export interface ProcessingResult {
  normalizedCSV: string;
  stats: NormalizationStats;
  needsReview: NormalizedRow[];
  success: boolean;
  error?: string;
}

/**
 * CSVNormalizationProcessor - Process CSV files with context-aware normalization
 * 
 * Handles:
 * 1. CSV parsing and column detection
 * 2. Batch normalization with context-aware repair
 * 3. Statistics generation
 * 4. CSV export with optional metadata
 */
export class CSVNormalizationProcessor {
  private normalizer: ContextAwareNormalizer;
  private options: Required<ProcessingOptions>;

  constructor(options: ProcessingOptions = {}) {
    this.options = {
      repairCities: options.repairCities ?? true,
      repairZIPs: options.repairZIPs ?? true,
      crossValidate: options.crossValidate ?? true,
      confidenceThreshold: options.confidenceThreshold ?? 70,
      includeMetadata: options.includeMetadata ?? true
    };

    this.normalizer = new ContextAwareNormalizer({
      repairCities: this.options.repairCities,
      repairZIPs: this.options.repairZIPs,
      crossValidate: this.options.crossValidate,
      confidenceThreshold: this.options.confidenceThreshold
    });
  }

  /**
   * Process CSV content
   */
  async processCSV(csvContent: string): Promise<ProcessingResult> {
    try {
      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      if (!records || records.length === 0) {
        return {
          normalizedCSV: '',
          stats: this.getEmptyStats(),
          needsReview: [],
          success: false,
          error: 'CSV file is empty or invalid'
        };
      }

      // Detect columns
      const columnMapping = this.detectColumns(records[0]);
      if (!columnMapping.city || !columnMapping.zip) {
        return {
          normalizedCSV: '',
          stats: this.getEmptyStats(),
          needsReview: [],
          success: false,
          error: 'Could not detect city and zip columns in CSV'
        };
      }

      // Normalize all rows
      const normalizedRows = await this.normalizer.batchNormalize(
        records.map(record => ({
          city: record[columnMapping.city!],
          zip: record[columnMapping.zip!],
          state: columnMapping.state ? record[columnMapping.state] : undefined,
          county: columnMapping.county ? record[columnMapping.county] : undefined,
          address: columnMapping.address ? record[columnMapping.address] : undefined
        }))
      );

      // Update original records with normalized data
      const updatedRecords = records.map((record: any, index) => {
        const normalized = normalizedRows[index];
        return {
          ...record,
          [columnMapping.city!]: normalized.city,
          [columnMapping.zip!]: normalized.zip,
          // Add metadata columns if requested
          ...(this.options.includeMetadata ? {
            'city_original': normalized.cityRepair?.original || '',
            'city_repair_method': normalized.cityRepair?.method || '',
            'city_confidence': normalized.cityRepair?.confidence || '',
            'zip_original': normalized.zipRepair?.original || '',
            'zip_repair_method': normalized.zipRepair?.method || '',
            'zip_confidence': normalized.zipRepair?.confidence || '',
            'validation_valid': normalized.validation?.valid || '',
            'validation_issues': normalized.validation?.issues.join('; ') || '',
            'overall_confidence': normalized.overallConfidence
          } : {})
        };
      });

      // Generate CSV output
      const normalizedCSV = stringify(updatedRecords, {
        header: true,
        quoted: true
      });

      // Get statistics
      const stats = ContextAwareNormalizer.getStats(normalizedRows);

      // Get rows that need review
      const needsReview = ContextAwareNormalizer.getNeedsReview(
        normalizedRows,
        this.options.confidenceThreshold
      );

      return {
        normalizedCSV,
        stats,
        needsReview,
        success: true
      };
    } catch (error) {
      return {
        normalizedCSV: '',
        stats: this.getEmptyStats(),
        needsReview: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Detect column names in CSV
   */
  private detectColumns(firstRow: Record<string, any>): {
    city?: string;
    zip?: string;
    state?: string;
    county?: string;
    address?: string;
  } {
    const columns = Object.keys(firstRow);
    const mapping: Record<string, string | undefined> = {};

    // City column patterns
    const cityPatterns = ['city', 'town', 'municipality'];
    mapping.city = columns.find(col => 
      cityPatterns.some(pattern => col.toLowerCase().includes(pattern))
    );

    // ZIP column patterns
    const zipPatterns = ['zip', 'postal', 'postcode', 'zipcode'];
    mapping.zip = columns.find(col => 
      zipPatterns.some(pattern => col.toLowerCase().includes(pattern))
    );

    // State column patterns
    const statePatterns = ['state', 'province', 'region'];
    mapping.state = columns.find(col => 
      statePatterns.some(pattern => col.toLowerCase().includes(pattern))
    );

    // County column patterns
    const countyPatterns = ['county', 'district'];
    mapping.county = columns.find(col => 
      countyPatterns.some(pattern => col.toLowerCase().includes(pattern))
    );

    // Address column patterns
    const addressPatterns = ['address', 'street', 'addr', 'location'];
    mapping.address = columns.find(col => 
      addressPatterns.some(pattern => col.toLowerCase().includes(pattern))
    );

    return mapping;
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats(): NormalizationStats {
    return {
      total: 0,
      citiesRepaired: 0,
      zipsRepaired: 0,
      validationFailures: 0,
      averageConfidence: 0,
      cityRepairMethods: {},
      zipRepairMethods: {},
      validationIssues: {}
    };
  }

  /**
   * Process CSV file from path
   */
  async processCSVFile(filePath: string): Promise<ProcessingResult> {
    const fs = await import('fs/promises');
    const csvContent = await fs.readFile(filePath, 'utf-8');
    return this.processCSV(csvContent);
  }

  /**
   * Save normalized CSV to file
   */
  async saveToFile(result: ProcessingResult, outputPath: string): Promise<void> {
    if (!result.success) {
      throw new Error(`Cannot save failed processing result: ${result.error}`);
    }

    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, result.normalizedCSV, 'utf-8');
  }
}
