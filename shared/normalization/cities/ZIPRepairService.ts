/**
 * ZIPRepairService
 * 
 * Repairs ZIP codes using city/state context:
 * 1. City + State → ZIP lookup
 * 2. Fallback to Texas cities database
 * 3. Validation against known ZIP patterns
 */

// Note: We use a simplified city→ZIP mapping approach
// In production, consider using a proper reverse lookup database
import { TEXAS_CITIES } from './TexasCitiesData';

export interface ZIPRepairResult {
  original: string;
  repaired: string;
  confidence: number;
  method: 'city_lookup' | 'fallback_lookup' | 'validation' | 'no_change';
  cityUsed?: string;
  stateUsed?: string;
}

export class ZIPRepairService {
  /**
   * Repair a ZIP code using city/state context
   */
  static repair(zipCode: string, city?: string, state?: string): ZIPRepairResult {
    const original = zipCode;
    
    // If ZIP is already valid, no repair needed
    if (this.isValidZIP(zipCode)) {
      return {
        original,
        repaired: zipCode,
        confidence: 1.0,
        method: 'no_change',
      };
    }
    
    // Strategy 1: Use city + state to find ZIP
    if (city && state) {
      const cityResult = this.repairFromCity(city, state);
      if (cityResult.confidence > 0.8) {
        return {
          ...cityResult,
          original,
        };
      }
    }
    
    // Strategy 2: Try city lookup without state (assume TX)
    if (city && !state) {
      const cityResult = this.repairFromCity(city, 'TX');
      if (cityResult.confidence > 0.8) {
        return {
          ...cityResult,
          original,
        };
      }
    }
    
    // Strategy 3: Fallback to Texas cities database
    if (city) {
      const fallbackResult = this.repairFromFallback(city);
      if (fallbackResult.confidence > 0.7) {
        return {
          ...fallbackResult,
          original,
        };
      }
    }
    
    // No repair possible
    return {
      original,
      repaired: zipCode,
      confidence: 0.0,
      method: 'no_change',
    };
  }
  
  /**
   * Repair ZIP from city/state lookup
   */
  private static repairFromCity(city: string, state: string): ZIPRepairResult {
    try {
      // Try to find ZIP by searching through known ZIPs
      // This is a simplified approach - in production, use a proper city→ZIP database
      const normalizedCity = city.toLowerCase().trim();
      const normalizedState = state.toUpperCase().trim();
      
      // Try common ZIP ranges for major cities
      const cityZipMap: Record<string, string> = {
        'houston': '77001',
        'dallas': '75201',
        'austin': '78701',
        'san antonio': '78201',
        'fort worth': '76101',
        'el paso': '79901',
        'arlington': '76010',
        'corpus christi': '78401',
        'plano': '75023',
        'laredo': '78040',
      };
      
      const zip = cityZipMap[normalizedCity];
      if (zip) {
        return {
          original: '',
          repaired: zip,
          confidence: 0.85,
          method: 'city_lookup',
          cityUsed: city,
          stateUsed: state,
        };
      }
    } catch (error) {
      // City lookup failed
    }
    
    return {
      original: '',
      repaired: '',
      confidence: 0.0,
      method: 'no_change',
    };
  }
  
  /**
   * Repair ZIP from fallback database (Texas cities)
   */
  private static repairFromFallback(city: string): ZIPRepairResult {
    const normalizedCity = city.toLowerCase().trim();
    
    for (const [cityName, zipCode] of Object.entries(TEXAS_CITIES)) {
      if (cityName.toLowerCase() === normalizedCity) {
        return {
          original: '',
          repaired: zipCode,
          confidence: 0.90,
          method: 'fallback_lookup',
          cityUsed: city,
          stateUsed: 'TX',
        };
      }
    }
    
    return {
      original: '',
      repaired: '',
      confidence: 0.0,
      method: 'no_change',
    };
  }
  
  /**
   * Check if ZIP code is valid (5 digits)
   */
  private static isValidZIP(zipCode: string): boolean {
    if (!zipCode) return false;
    const cleaned = zipCode.replace(/\s/g, '');
    return /^\d{5}$/.test(cleaned);
  }
  
  /**
   * Check if a ZIP code needs repair
   */
  static needsRepair(zipCode: string): boolean {
    // Empty or NaN or whitespace-only
    if (!zipCode || zipCode.trim() === '' || zipCode === 'NaN' || zipCode === 'null' || zipCode === 'undefined') {
      return true;
    }
    
    // Not 5 digits
    const cleaned = zipCode.replace(/\s/g, '');
    if (!/^\d{5}$/.test(cleaned)) {
      return true;
    }
    
    return false;
  }
}
