import { CityRepairService, CityRepairResult } from './CityRepairService';
import { ZIPRepairService, ZIPRepairResult } from './ZIPRepairService';
import { ValidationService, ValidationResult } from './ValidationService';

export interface NormalizationOptions {
  repairCities?: boolean;
  repairZIPs?: boolean;
  crossValidate?: boolean;
  confidenceThreshold?: number;
}

export interface NormalizedRow {
  city: string;
  zip: string;
  state?: string;
  county?: string;
  address?: string;
  
  // Repair metadata
  cityRepair?: CityRepairResult;
  zipRepair?: ZIPRepairResult;
  validation?: ValidationResult;
  
  // Overall confidence
  overallConfidence: number;
}

export interface NormalizationStats {
  total: number;
  citiesRepaired: number;
  zipsRepaired: number;
  validationFailures: number;
  averageConfidence: number;
  
  cityRepairMethods: Record<string, number>;
  zipRepairMethods: Record<string, number>;
  validationIssues: Record<string, number>;
}

/**
 * ContextAwareNormalizer - Orchestrates intelligent city/ZIP normalization
 * 
 * Main entry point for context-aware normalization that:
 * 1. Repairs city names using ZIP codes and county context
 * 2. Repairs ZIP codes using city names and address context
 * 3. Cross-validates city/ZIP matches
 * 4. Provides detailed statistics and confidence scores
 */
export class ContextAwareNormalizer {
  private options: Required<NormalizationOptions>;

  constructor(options: NormalizationOptions = {}) {
    this.options = {
      repairCities: options.repairCities ?? true,
      repairZIPs: options.repairZIPs ?? true,
      crossValidate: options.crossValidate ?? true,
      confidenceThreshold: options.confidenceThreshold ?? 70
    };
  }

  /**
   * Normalize a single row
   */
  normalize(row: {
    city?: string;
    zip?: string;
    state?: string;
    county?: string;
    address?: string;
  }): NormalizedRow {
    let currentCity = row.city || '';
    let currentZIP = row.zip || '';
    
    let cityRepair: CityRepairResult | undefined;
    let zipRepair: ZIPRepairResult | undefined;
    let validation: ValidationResult | undefined;

    // Step 1: Repair city name
    if (this.options.repairCities) {
      cityRepair = CityRepairService.repair({
        city: currentCity,
        zip: currentZIP,
        state: row.state,
        county: row.county,
        address: row.address
      });
      
      // Update current city if confidence meets threshold
      if (cityRepair.confidence >= this.options.confidenceThreshold) {
        currentCity = cityRepair.city;
      }
    }

    // Step 2: Repair ZIP code (using potentially repaired city)
    if (this.options.repairZIPs) {
      zipRepair = ZIPRepairService.repair({
        city: currentCity,
        zip: currentZIP,
        state: row.state,
        county: row.county,
        address: row.address
      });
      
      // Update current ZIP if confidence meets threshold
      if (zipRepair.confidence >= this.options.confidenceThreshold) {
        currentZIP = zipRepair.zip;
      }
    }

    // Step 3: Cross-validate city/ZIP match
    if (this.options.crossValidate) {
      validation = ValidationService.validateCityZIPMatch({
        city: currentCity,
        zip: currentZIP,
        state: row.state,
        county: row.county
      });
    }

    // Calculate overall confidence
    const confidenceScores: number[] = [];
    if (cityRepair) confidenceScores.push(cityRepair.confidence);
    if (zipRepair) confidenceScores.push(zipRepair.confidence);
    if (validation) confidenceScores.push(validation.confidence);
    
    const overallConfidence = confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
      : 0;

    return {
      city: currentCity,
      zip: currentZIP,
      state: row.state,
      county: row.county,
      address: row.address,
      cityRepair,
      zipRepair,
      validation,
      overallConfidence
    };
  }

  /**
   * Normalize multiple rows in batch
   */
  batchNormalize(rows: Array<{
    city?: string;
    zip?: string;
    state?: string;
    county?: string;
    address?: string;
  }>): NormalizedRow[] {
    return rows.map(row => this.normalize(row));
  }

  /**
   * Get normalization statistics
   */
  static getStats(results: NormalizedRow[]): NormalizationStats {
    const citiesRepaired = results.filter(r => r.cityRepair?.needsRepair).length;
    const zipsRepaired = results.filter(r => r.zipRepair?.needsRepair).length;
    const validationFailures = results.filter(r => r.validation && !r.validation.valid).length;

    const cityRepairMethods: Record<string, number> = {};
    const zipRepairMethods: Record<string, number> = {};
    const validationIssues: Record<string, number> = {};

    results.forEach(r => {
      if (r.cityRepair) {
        cityRepairMethods[r.cityRepair.method] = (cityRepairMethods[r.cityRepair.method] || 0) + 1;
      }
      
      if (r.zipRepair) {
        zipRepairMethods[r.zipRepair.method] = (zipRepairMethods[r.zipRepair.method] || 0) + 1;
      }
      
      if (r.validation) {
        r.validation.issues.forEach(issue => {
          validationIssues[issue] = (validationIssues[issue] || 0) + 1;
        });
      }
    });

    const totalConfidence = results.reduce((sum, r) => sum + r.overallConfidence, 0);
    const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    return {
      total: results.length,
      citiesRepaired,
      zipsRepaired,
      validationFailures,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      cityRepairMethods,
      zipRepairMethods,
      validationIssues
    };
  }

  /**
   * Export results to CSV format
   */
  static exportToCSV(results: NormalizedRow[], includeMetadata: boolean = true): string {
    const headers = ['city', 'zip', 'state', 'county', 'address'];
    
    if (includeMetadata) {
      headers.push(
        'city_original',
        'city_repair_method',
        'city_confidence',
        'zip_original',
        'zip_repair_method',
        'zip_confidence',
        'validation_valid',
        'validation_issues',
        'overall_confidence'
      );
    }

    const rows = results.map(r => {
      const baseRow = [
        r.city,
        r.zip,
        r.state || '',
        r.county || '',
        r.address || ''
      ];

      if (includeMetadata) {
        baseRow.push(
          r.cityRepair?.original || '',
          r.cityRepair?.method || '',
          r.cityRepair?.confidence.toString() || '',
          r.zipRepair?.original || '',
          r.zipRepair?.method || '',
          r.zipRepair?.confidence.toString() || '',
          r.validation?.valid.toString() || '',
          r.validation?.issues.join('; ') || '',
          r.overallConfidence.toString()
        );
      }

      return baseRow.map(cell => `"${cell}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Filter results by confidence threshold
   */
  static filterByConfidence(results: NormalizedRow[], minConfidence: number): NormalizedRow[] {
    return results.filter(r => r.overallConfidence >= minConfidence);
  }

  /**
   * Get rows that need manual review (low confidence or validation failures)
   */
  static getNeedsReview(results: NormalizedRow[], confidenceThreshold: number = 70): NormalizedRow[] {
    return results.filter(r => 
      r.overallConfidence < confidenceThreshold || 
      (r.validation && !r.validation.valid)
    );
  }
}
