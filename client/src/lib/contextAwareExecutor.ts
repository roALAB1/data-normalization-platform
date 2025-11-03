/**
 * Context-Aware Executor
 * 
 * Executes normalization plan with context awareness:
 * - Normalizes primary columns first and caches results
 * - Derives component columns from cache (doesn't re-normalize)
 * - Normalizes independent columns separately
 * 
 * This prevents the overwriting issue where existing First/Last columns
 * overwrite the correctly normalized values from the Name column.
 */

import { NameEnhanced } from './NameEnhanced';
import { normalizeValue } from './normalizeValue';
import type { ColumnSchema } from './schemaAnalyzer';
import type { NormalizationPlan } from './normalizationPlan';

/**
 * Process a single row with context awareness
 */
export function processRowWithContext(
  row: any,
  schema: ColumnSchema[],
  plan: NormalizationPlan
): any {
  const normalized = { ...row };
  const cache = new Map<string, NameEnhanced>(); // Cache normalized results
  
  // Phase 1: Normalize primary columns first
  plan.primary.forEach(colName => {
    const value = row[colName];
    if (!value) return;
    
    const colSchema = schema.find(s => s.name === colName);
    if (!colSchema) return;
    
    if (colSchema.type === 'name') {
      // Normalize full name and cache the result
      const name = new NameEnhanced(value);
      cache.set(colName, name);
      
      // v3.10.0: Remove "Name" column from output (only output First Name + Last Name)
      delete normalized[colName];
      
      // v3.10.0: Always output First Name and Last Name when processing a name column
      if (name.isValid) {
        normalized['First Name'] = name.firstName || '';
        normalized['Last Name'] = name.lastName || '';
      }
    } else if (colSchema.type === 'location') {
      // v3.12.0: Split location into Personal City and Personal State
      // Input format: "Durham, North Carolina, United States" or "Durham, NC, United States"
      // Output: Personal City: "Durham", Personal State: "NC"
      const parts = value.split(',').map((p: string) => p.trim());
      
      if (parts.length >= 2) {
        // First part is city
        const city = parts[0];
        normalized['Personal City'] = city.split(' ').map((w: string) => 
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' ');
        
        // Second part is state (could be full name or abbreviation)
        const state = parts[1];
        // If it's already an abbreviation (2 letters), uppercase it
        if (state.length === 2) {
          normalized['Personal State'] = state.toUpperCase();
        } else {
          // If it's a full state name, convert to abbreviation
          const stateAbbreviations: Record<string, string> = {
            'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
            'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
            'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
            'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
            'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
            'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
            'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
            'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
            'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
            'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
          };
          const stateLower = state.toLowerCase();
          normalized['Personal State'] = stateAbbreviations[stateLower] || state.toUpperCase();
        }
      }
      
      // Remove original location column
      delete normalized[colName];
    } else {
      // Other types - normalize directly
      normalized[colName] = normalizeValue(colSchema.type, value);
    }
  });
  
  // Phase 2: Derive component columns from cache (DON'T re-normalize!)
  plan.derived.forEach(({ column, primary, extract }) => {
    const cached = cache.get(primary);
    
    if (cached && cached.isValid) {
      // Extract from cached result
      if (extract === 'firstName') {
        normalized[column] = cached.firstName || '';
      } else if (extract === 'lastName') {
        normalized[column] = cached.lastName || '';
      } else if (extract === 'full') {
        normalized[column] = cached.full;
      }
    } else {
      // Primary wasn't cached or invalid - normalize independently
      const value = row[column];
      if (value) {
        const colSchema = schema.find(s => s.name === column);
        if (colSchema) {
          normalized[column] = normalizeValue(colSchema.type, value);
        }
      }
    }
  });
  
  // Phase 3: Normalize independent columns
  plan.independent.forEach(colName => {
    const value = row[colName];
    if (!value) return;
    
    const colSchema = schema.find(s => s.name === colName);
    if (!colSchema || colSchema.type === 'unknown') {
      // Keep original value for unknown types
      normalized[colName] = value;
      return;
    }
    
    normalized[colName] = normalizeValue(colSchema.type, value);
  });
  
  return normalized;
}
