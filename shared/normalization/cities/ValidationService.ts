/**
 * ValidationService
 * 
 * Cross-validates city/ZIP/state combinations:
 * 1. ZIP → City validation
 * 2. City + State → ZIP validation
 * 3. Confidence scoring
 */

import { getCity } from '@mardillu/us-cities-utils';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  errors: string[];
  warnings: string[];
}

export class ValidationService {
  /**
   * Validate city/ZIP/state combination
   */
  static validate(city: string, zipCode: string, state?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    
    // Validate ZIP format
    if (!this.isValidZIPFormat(zipCode)) {
      errors.push('Invalid ZIP code format');
      confidence -= 0.3;
    }
    
    // Cross-validate ZIP with city
    if (city && zipCode && this.isValidZIPFormat(zipCode)) {
      const zipValidation = this.validateZIPCity(zipCode, city);
      if (!zipValidation.isValid) {
        warnings.push(`ZIP ${zipCode} may not match city ${city}`);
        confidence -= 0.2;
      }
    }
    
    // Cross-validate ZIP with state
    if (state && zipCode && this.isValidZIPFormat(zipCode)) {
      const stateValidation = this.validateZIPState(zipCode, state);
      if (!stateValidation.isValid) {
        warnings.push(`ZIP ${zipCode} may not match state ${state}`);
        confidence -= 0.2;
      }
    }
    
    const isValid = errors.length === 0;
    
    return {
      isValid,
      confidence: Math.max(0, confidence),
      errors,
      warnings,
    };
  }
  
  /**
   * Validate ZIP code format
   */
  private static isValidZIPFormat(zipCode: string): boolean {
    if (!zipCode) return false;
    const cleaned = zipCode.replace(/\s/g, '');
    return /^\d{5}$/.test(cleaned);
  }
  
  /**
   * Validate ZIP matches city
   */
  private static validateZIPCity(zipCode: string, city: string): ValidationResult {
    try {
      const result = getCity(zipCode);
      if (result && result.name) {
        const expectedCity = result.name.toLowerCase();
        const actualCity = city.toLowerCase();
        
        // Exact match
        if (expectedCity === actualCity) {
          return {
            isValid: true,
            confidence: 1.0,
            errors: [],
            warnings: [],
          };
        }
        
        // Partial match (e.g., "San Angelo" vs "San")
        if (expectedCity.includes(actualCity) || actualCity.includes(expectedCity)) {
          return {
            isValid: true,
            confidence: 0.8,
            errors: [],
            warnings: [`Partial city match: ${city} ≈ ${result.name}`],
          };
        }
        
        // No match
        return {
          isValid: false,
          confidence: 0.3,
          errors: [],
          warnings: [`City mismatch: expected ${result.name}, got ${city}`],
        };
      }
    } catch (error) {
      // ZIP lookup failed
    }
    
    return {
      isValid: false,
      confidence: 0.0,
      errors: ['ZIP lookup failed'],
      warnings: [],
    };
  }
  
  /**
   * Validate ZIP matches state
   */
  private static validateZIPState(zipCode: string, state: string): ValidationResult {
    try {
      const result = getCity(zipCode);
      if (result && result.state) {
        const expectedState = result.state.toUpperCase();
        const actualState = state.toUpperCase();
        
        // Exact match
        if (expectedState === actualState) {
          return {
            isValid: true,
            confidence: 1.0,
            errors: [],
            warnings: [],
          };
        }
        
        // No match
        return {
          isValid: false,
          confidence: 0.2,
          errors: [],
          warnings: [`State mismatch: expected ${result.state}, got ${state}`],
        };
      }
    } catch (error) {
      // ZIP lookup failed
    }
    
    return {
      isValid: false,
      confidence: 0.0,
      errors: ['ZIP lookup failed'],
      warnings: [],
    };
  }
  
  /**
   * Get confidence score for city/ZIP/state combination
   */
  static getConfidenceScore(city: string, zipCode: string, state?: string): number {
    const validation = this.validate(city, zipCode, state);
    return validation.confidence;
  }
}
