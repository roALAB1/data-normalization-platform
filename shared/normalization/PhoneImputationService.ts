/**
 * PhoneImputationService
 * 
 * Intelligently fills missing phone numbers using context from other rows:
 * - Same company name
 * - Same address
 * - Same city
 * - Same state
 * 
 * Strategy:
 * 1. Build lookup map from rows with phone numbers
 * 2. For rows with missing phones, search for matches
 * 3. Return imputed phone with confidence score
 */

export interface PhoneImputationResult {
  original: string;
  imputed: string;
  confidence: number;
  method: 'exact_match' | 'fuzzy_match' | 'no_match';
  sourceRow?: number;
}

export interface RowContext {
  rowIndex: number;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
}

export class PhoneImputationService {
  /**
   * Normalize a string for matching (lowercase, remove punctuation, trim whitespace)
   */
  private static normalizeForMatching(value: string | undefined): string {
    if (!value) return '';
    return value
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }
  
  /**
   * Normalize company name for matching (remove common suffixes)
   */
  private static normalizeCompany(company: string | undefined): string {
    if (!company) return '';
    
    let normalized = this.normalizeForMatching(company);
    
    // Remove common company suffixes (iteratively remove all trailing suffixes)
    const suffixes = [
      'llc', 'inc', 'incorporated', 'corp', 'corporation', 'co', 'company',
      'ltd', 'limited', 'lp', 'llp', 'pllc', 'pc', 'pa', 'dba'
    ];
    
    let words = normalized.split(' ');
    
    // Keep removing trailing suffixes until no more match
    while (words.length > 1 && suffixes.includes(words[words.length - 1])) {
      words = words.slice(0, -1);
    }
    
    return words.join(' ');
  }
  
  /**
   * Normalize address for matching (remove common street suffixes)
   */
  private static normalizeAddress(address: string | undefined): string {
    if (!address) return '';
    
    const normalized = this.normalizeForMatching(address);
    
    // Remove common street suffixes
    const suffixes = [
      'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr',
      'lane', 'ln', 'boulevard', 'blvd', 'court', 'ct', 'place', 'pl',
      'way', 'circle', 'cir', 'parkway', 'pkwy', 'highway', 'hwy'
    ];
    
    const words = normalized.split(' ');
    const lastWord = words[words.length - 1];
    
    if (suffixes.includes(lastWord)) {
      return words.slice(0, -1).join(' ');
    }
    
    return normalized;
  }

  /**
   * Create a lookup key from row context
   */
  private static createLookupKey(context: RowContext): string {
    const company = this.normalizeCompany(context.company);
    const address = this.normalizeAddress(context.address);
    const city = this.normalizeForMatching(context.city);
    const state = this.normalizeForMatching(context.state);
    
    return `${company}|${address}|${city}|${state}`;
  }

  /**
   * Build lookup map from rows with phone numbers
   */
  private static buildLookupMap(rows: RowContext[]): Map<string, { phone: string; rowIndex: number }> {
    const map = new Map<string, { phone: string; rowIndex: number }>();
    
    rows.forEach((row) => {
      // Only include rows with valid phone numbers
      if (row.phone && row.phone.trim() !== '' && row.phone !== 'NaN') {
        const key = this.createLookupKey(row);
        
        // Only store if we don't already have this key
        // (first occurrence wins)
        if (!map.has(key)) {
          map.set(key, {
            phone: row.phone,
            rowIndex: row.rowIndex,
          });
        }
      }
    });
    
    return map;
  }

  /**
   * Impute phone number for a single row
   */
  static impute(
    targetRow: RowContext,
    allRows: RowContext[]
  ): PhoneImputationResult {
    const original = targetRow.phone || '';
    
    // If phone already exists, no imputation needed
    if (original && original.trim() !== '' && original !== 'NaN') {
      return {
        original,
        imputed: original,
        confidence: 1.0,
        method: 'no_match',
      };
    }
    
    // Build lookup map
    const lookupMap = this.buildLookupMap(allRows);
    
    // Try exact match
    const key = this.createLookupKey(targetRow);
    const match = lookupMap.get(key);
    
    if (match) {
      return {
        original,
        imputed: match.phone,
        confidence: 0.95,
        method: 'exact_match',
        sourceRow: match.rowIndex,
      };
    }
    
    // Try fuzzy match (company + city + state, ignore address)
    const fuzzyKey = `${this.normalizeCompany(targetRow.company)}||${this.normalizeForMatching(targetRow.city)}|${this.normalizeForMatching(targetRow.state)}`;
    
    for (const [storedKey, value] of lookupMap.entries()) {
      const [storedCompany, , storedCity, storedState] = storedKey.split('|');
      const storedFuzzyKey = `${storedCompany}||${storedCity}|${storedState}`;
      
      if (fuzzyKey === storedFuzzyKey) {
        return {
          original,
          imputed: value.phone,
          confidence: 0.75,
          method: 'fuzzy_match',
          sourceRow: value.rowIndex,
        };
      }
    }
    
    // No match found
    return {
      original,
      imputed: original,
      confidence: 0.0,
      method: 'no_match',
    };
  }

  /**
   * Batch impute phone numbers for multiple rows
   */
  static imputeBatch(rows: RowContext[]): PhoneImputationResult[] {
    return rows.map((row) => this.impute(row, rows));
  }
}
