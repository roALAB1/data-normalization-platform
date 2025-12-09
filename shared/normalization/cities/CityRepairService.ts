/**
 * CityRepairService
 * 
 * Repairs city names using multiple strategies:
 * 1. Title case conversion (austin → Austin)
 * 2. ZIP-to-city lookup (76903 → San Angelo)
 * 3. Truncated city repair (san → San Antonio with context)
 */

import { getCity } from '@mardillu/us-cities-utils';

export interface CityRepairResult {
  original: string;
  repaired: string;
  confidence: number;
  method: 'title_case' | 'zip_lookup' | 'truncated_repair' | 'no_change';
  zipUsed?: string;
}

export class CityRepairService {
  /**
   * Repair a city name using available context
   */
  static repair(city: string, zipCode?: string): CityRepairResult {
    const original = city;
    
    // Strategy 1: If city looks like a ZIP code (5 digits), use ZIP lookup
    // v3.47.1: Always repair if city contains ZIP, regardless of zipCode parameter
    if (/^\d{5}$/.test(city.trim())) {
      const zipResult = this.repairFromZIP(city.trim());
      if (zipResult.confidence > 0.8) {
        return zipResult;
      }
    }
    
    // Strategy 2: If we have a ZIP code, try ZIP-to-city lookup
    if (zipCode && /^\d{5}$/.test(zipCode)) {
      const zipResult = this.repairFromZIP(zipCode);
      if (zipResult.confidence > 0.8) {
        // Verify the city name is reasonable (not just title case of original)
        const cityLower = city.toLowerCase();
        const repairedLower = zipResult.repaired.toLowerCase();
        
        // If original is truncated or wrong, use ZIP lookup
        if (cityLower.length < 4 || !repairedLower.includes(cityLower.substring(0, 3))) {
          return {
            ...zipResult,
            original,
          };
        }
      }
    }
    
    // Strategy 3: Title case conversion (always apply)
    const titleCased = this.toTitleCase(city);
    return {
      original,
      repaired: titleCased,
      confidence: 0.95,
      method: 'title_case',
    };
  }
  
  /**
   * Repair city from ZIP code lookup
   */
  private static repairFromZIP(zipCode: string): CityRepairResult {
    try {
      const result = getCity(zipCode);
      if (result && result.name) {
        return {
          original: zipCode,
          repaired: result.name,
          confidence: 0.99,
          method: 'zip_lookup',
          zipUsed: zipCode,
        };
      }
    } catch (error) {
      // ZIP lookup failed
    }
    
    return {
      original: zipCode,
      repaired: zipCode,
      confidence: 0.0,
      method: 'no_change',
    };
  }
  
  /**
   * Convert string to title case
   * Handles special cases like "SAN ANGELO" → "San Angelo"
   */
  private static toTitleCase(str: string): string {
    if (!str) return str;
    
    const exceptions = new Set([
      'and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for',
      'with', 'by', 'from', 'as', 'but', 'nor', 'yet', 'so',
    ]);
    
    return str
      .toLowerCase()
      .split(/\s+/)
      .map((word, index) => {
        // Always capitalize first word
        if (index === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        
        // Check if word is an exception
        if (exceptions.has(word)) {
          return word;
        }
        
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
  
  /**
   * Check if a city name needs repair
   */
  static needsRepair(city: string): boolean {
    if (!city || city.trim().length === 0) {
      return false; // Empty cities don't need repair
    }
    
    // Check if all lowercase
    if (city === city.toLowerCase() && city.length > 0) {
      return true;
    }
    
    // Check if all uppercase
    if (city === city.toUpperCase() && city.length > 1) {
      return true;
    }
    
    // Check if mixed case (not proper title case)
    const titleCased = this.toTitleCase(city);
    if (city !== titleCased) {
      return true;
    }
    
    // Check if looks like a ZIP code
    if (/^\d{5}$/.test(city.trim())) {
      return true;
    }
    
    // Check if truncated (less than 3 characters)
    if (city.trim().length < 3) {
      return true;
    }
    
    return false;
  }
}
