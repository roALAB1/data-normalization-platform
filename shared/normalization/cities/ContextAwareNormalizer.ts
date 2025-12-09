/**
 * ContextAwareNormalizer
 * 
 * Orchestrates city/ZIP normalization using context from multiple columns:
 * 1. Repairs cities using ZIP context
 * 2. Repairs ZIPs using city context
 * 3. Cross-validates results
 * 4. Returns confidence scores
 */

import { CityRepairService, CityRepairResult } from './CityRepairService';
import { ZIPRepairService, ZIPRepairResult } from './ZIPRepairService';
import { ValidationService, ValidationResult } from './ValidationService';

export interface NormalizationContext {
  city?: string;
  zipCode?: string;
  state?: string;
}

export interface NormalizationResult {
  city: string;
  zipCode: string;
  state?: string;
  cityRepair?: CityRepairResult;
  zipRepair?: ZIPRepairResult;
  validation?: ValidationResult;
  overallConfidence: number;
}

export class ContextAwareNormalizer {
  /**
   * Normalize city/ZIP/state using context-aware repair
   */
  static normalize(context: NormalizationContext): NormalizationResult {
    let { city, zipCode, state } = context;
    
    let cityRepair: CityRepairResult | undefined;
    let zipRepair: ZIPRepairResult | undefined;
    let validation: ValidationResult | undefined;
    
    // Step 1: Repair city if needed
    if (city && CityRepairService.needsRepair(city)) {
      cityRepair = CityRepairService.repair(city, zipCode);
      city = cityRepair.repaired;
    }
    
    // Step 2: Repair ZIP if needed
    if (ZIPRepairService.needsRepair(zipCode || '')) {
      zipRepair = ZIPRepairService.repair(zipCode || '', city, state);
      zipCode = zipRepair.repaired;
    }
    
    // Step 3: Validate results
    if (city && zipCode) {
      validation = ValidationService.validate(city, zipCode, state);
    }
    
    // Step 4: Calculate overall confidence
    const confidenceScores: number[] = [];
    
    if (cityRepair) {
      confidenceScores.push(cityRepair.confidence);
    }
    
    if (zipRepair) {
      confidenceScores.push(zipRepair.confidence);
    }
    
    if (validation) {
      confidenceScores.push(validation.confidence);
    }
    
    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 1.0;
    
    return {
      city: city || '',
      zipCode: zipCode || '',
      state,
      cityRepair,
      zipRepair,
      validation,
      overallConfidence,
    };
  }
  
  /**
   * Normalize a single city value with optional context
   */
  static normalizeCity(city: string, zipCode?: string): string {
    if (!city) return '';
    
    const result = this.normalize({ city, zipCode });
    return result.city;
  }
  
  /**
   * Normalize a single ZIP value with optional context
   */
  static normalizeZIP(zipCode: string, city?: string, state?: string): string {
    if (!zipCode) return '';
    
    const result = this.normalize({ zipCode, city, state });
    return result.zipCode;
  }
  
  /**
   * Batch normalize multiple rows
   */
  static normalizeBatch(rows: NormalizationContext[]): NormalizationResult[] {
    return rows.map(row => this.normalize(row));
  }
}
